# backend_main.py

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from pathlib import Path
import logging
import threading
import asyncio
import whisper
import glob
import json
import time
import generate_speech
import merge_audio_bgm
import re
import jamendo
from datetime import datetime
from difflib import SequenceMatcher
import os.path
from typing import Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define directories
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
SPEECH_DIR = os.path.join(OUTPUT_DIR, "speech")
INPUT_TEXT_FILE_PATH = os.path.join(UPLOAD_DIR, "input.txt")
BGM_FILE_PATH = os.path.join(OUTPUT_DIR, "background_music.mp3")
MERGED_SPEECH_BGM_OUTPUT = os.path.join(OUTPUT_DIR, "output_merged_ai_second.mp3")
DEFAULT_CHARACTERS_TO_EXCLUDE = []

# Global variable to track generation progress
generation_progress = {
    "progress": 0,
    "stage": "Not started",
    "is_generating": False
}

# Create necessary directories
for directory in [UPLOAD_DIR, OUTPUT_DIR, SPEECH_DIR]:
    os.makedirs(directory, exist_ok=True)

def cleanup_temp_files():
    """Clean up temporary audio files after generation."""
    try:
        logger.info("Cleaning up temporary audio files...")
        patterns = [
            os.path.join(SPEECH_DIR, "*.wav"),
            os.path.join(SPEECH_DIR, "*.mp3"),
            os.path.join(OUTPUT_DIR, "temp_*.wav"),
            os.path.join(OUTPUT_DIR, "temp_*.mp3"),
            os.path.join(UPLOAD_DIR, "*.txt"),
            os.path.join(UPLOAD_DIR, "*.wav"),
            os.path.join(UPLOAD_DIR, "*.mp3")
        ]
        
        deleted_count = 0
        for pattern in patterns:
            for file_path in glob.glob(pattern):
                os.remove(file_path)
                deleted_count += 1
        
        logger.info(f"Cleanup complete: {deleted_count} temporary files removed")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")

@app.post("/parse-characters/")
async def parse_characters(file: UploadFile = File(...)):
    """Extract characters from the input text file."""
    try:
        temp_file_path = os.path.join(UPLOAD_DIR, "temp_" + file.filename)
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Try reading with utf-8 first, fallback to latin-1
        try:
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(temp_file_path, 'r', encoding='latin-1') as f:
                content = f.read()
        
        # Match character names at the start of dialogue
        pattern = r'(?:^|\n)<([^>]+)>(?:\s*<[^>]+>)?\s*"'
        matches = re.findall(pattern, content)
        
        # Process and clean character names
        characters = sorted(list(set(match.strip() for match in matches 
                                   if match.strip() and match.strip() not in DEFAULT_CHARACTERS_TO_EXCLUDE)))
        
        logger.info(f"Found characters: {characters}")
        
        # Clean up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        
        return {"characters": characters}
    except Exception as e:
        logger.error(f"Error parsing characters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse characters: {str(e)}")
    
@app.get("/latest-story/")
async def get_latest_story():
    """Get the latest story file from stories directory."""
    stories_dir = "../stories"
    
    try:
        # Get all .txt files in the stories directory
        story_files = glob.glob(os.path.join(stories_dir, "*.txt"))
        
        if not story_files:
            return {"error": "No story files found"}
            
        # Get the most recently modified file
        latest_story = max(story_files, key=os.path.getmtime)
        
        # Read the file content
        try:
            with open(latest_story, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(latest_story, 'r', encoding='latin-1') as f:
                content = f.read()
        
        filename = os.path.basename(latest_story)
        
        # Copy the file to the uploads directory as input.txt
        with open(INPUT_TEXT_FILE_PATH, "w", encoding='utf-8') as f:
            f.write(content)
        
        # Parse characters from the story
        pattern = r'(?:^|\n)<([^>]+)>(?:\s*<[^>]+>)?\s*"'
        matches = re.findall(pattern, content)
        characters = sorted(list(set(match.strip() for match in matches 
                                   if match.strip() and match.strip() not in DEFAULT_CHARACTERS_TO_EXCLUDE)))
        
        return {
            "filename": filename,
            "content": content,
            "characters": characters
        }
    except Exception as e:
        logger.error(f"Error getting latest story: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get latest story: {str(e)}")
    
@app.get("/generation-progress/")
async def get_generation_progress():
    """Get the current progress of audio generation."""
    return generation_progress

@app.get("/default-voices/")
async def get_default_voices():
    """Get list of default voices from the default_voices directory and its subdirectories."""
    voices_dir = "default_voices"
    
    if not os.path.exists(voices_dir):
        os.makedirs(voices_dir, exist_ok=True)
        return {"voices": []}
    
    voices = []
    
    # Walk through all subdirectories
    for root, dirs, files in os.walk(voices_dir):
        for file in files:
            if file.endswith((".mp3", ".wav")):
                rel_path = os.path.relpath(os.path.join(root, file), voices_dir)
                file_path = os.path.join(voices_dir, rel_path)
                
                voice_name = os.path.splitext(file)[0].replace("_", " ").title()
                category = os.path.dirname(rel_path) if os.path.dirname(rel_path) else "Default"
                category = category.replace("_", " ").title()
                
                voices.append({
                    "name": voice_name,
                    "filename": rel_path,
                    "path": file_path,
                    "category": category
                })
    
    # Sort by category and then by name
    voices.sort(key=lambda x: (x["category"], x["name"]))
            
    return {"voices": voices}

@app.get("/voices/preview/{filename:path}")
async def preview_voice(filename: str):
    """Serve voice files for preview, supporting subdirectories."""
    voice_path = os.path.join("default_voices", filename)
    
    if os.path.exists(voice_path):
        return FileResponse(voice_path)
    else:
        raise HTTPException(status_code=404, detail="Voice file not found.")
    

@app.get("/word-timestamps/")
async def get_word_timestamps():
    """Get the word timestamps JSON file if it exists."""
    timestamp_file = os.path.join(OUTPUT_DIR, "word_timestamps.json")
    
    if os.path.exists(timestamp_file):
        try:
            with open(timestamp_file, "r") as f:
                data = json.load(f)
            return data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read timestamp file: {str(e)}")
    else:
        raise HTTPException(status_code=404, detail="Word timestamps not available")


def load_text_file(file_path: str) -> str:
    """Load and return the content of the text file with appropriate encoding."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='latin-1') as f:
            return f.read()
    except Exception as e:
        raise Exception(f"Error reading text file {file_path}: {str(e)}")

def parse_dialogue(text: str) -> list[dict[str, str]]:
    """Parse the input text into a list of dialogue entries with character and text."""
    dialogue_entries = []
    dialogue_pattern = r'(?:^|\n)<([^>]+)>(?:\s*<[^>]+>)?\s*"([^"]*)"'
    matches = re.findall(dialogue_pattern, text)
    
    for character, line in matches:
        dialogue_entries.append({
            'character': character.strip(),
            'text': line.strip()
        })
    
    return dialogue_entries

def align_words(whisper_words: list[dict], correct_text: str) -> list[dict]:
    """Align Whisper's word timestamps with the correct text from the input file."""
    correct_words = correct_text.split()
    whisper_word_texts = [w['word'].strip() for w in whisper_words]
    aligned_words = []
    
    if not correct_words or not whisper_words:
        return aligned_words
    
    matcher = SequenceMatcher(None, whisper_word_texts, correct_words)
    
    if 0.7 <= len(correct_words) / max(len(whisper_words), 1) <= 1.3:
        for i, correct_word in enumerate(correct_words):
            if i < len(whisper_words):
                word_info = whisper_words[i].copy()
                word_info['word'] = correct_word
                word_info['aligned'] = True
                aligned_words.append(word_info)
            else:
                last_word = whisper_words[-1]
                word_info = {
                    'word': correct_word,
                    'start': last_word['end'],
                    'end': last_word['end'] + 0.2,
                    'probability': 0.9,
                    'aligned': True
                }
                aligned_words.append(word_info)
    else:
        start_time = whisper_words[0]['start']
        end_time = whisper_words[-1]['end']
        total_duration = end_time - start_time
        
        for i, word in enumerate(correct_words):
            relative_pos = i / max(len(correct_words) - 1, 1)
            word_start = start_time + (relative_pos * total_duration)
            word_end = start_time + ((i + 1) / max(len(correct_words), 1) * total_duration)
            aligned_words.append({
                'word': word,
                'start': word_start,
                'end': word_end,
                'probability': 0.9,
                'aligned': True
            })
    
    return aligned_words

def generate_word_timestamps(audio_path: str) -> Optional[str]:
    """Generate word-level timestamps by aligning audio with the input text."""
    try:
        logger.info(f"Generating word timestamps for {audio_path}")
        
        # Create output directory
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Load text file
        if not os.path.exists(INPUT_TEXT_FILE_PATH):
            raise FileNotFoundError(f"Text file {INPUT_TEXT_FILE_PATH} not found")
        
        original_text = load_text_file(INPUT_TEXT_FILE_PATH)
        dialogue_entries = parse_dialogue(original_text)
        
        # Load Whisper model
        model = whisper.load_model("base")
        
        # Transcribe audio with word-level timestamps
        result = model.transcribe(audio_path, word_timestamps=True)
        
        # Initialize corrected segments
        corrected_segments = []
        used_entries = []
        
        # Align each segment with a dialogue entry
        for segment in result['segments']:
            whisper_text = segment['text'].strip().lower()
            best_match = None
            best_similarity = 0
            
            # Find the best matching dialogue entry
            for entry in dialogue_entries:
                if entry in used_entries:
                    continue
                entry_text = entry['text'].lower()
                common_words = set(whisper_text.split()) & set(entry_text.split())
                similarity = len(common_words) / max(len(whisper_text.split()), 1)
                
                if similarity > best_similarity and similarity > 0.3:
                    best_similarity = similarity
                    best_match = entry
            
            if best_match:
                # Create new segment with correct text
                new_segment = segment.copy()
                new_segment['text'] = best_match['text']
                new_segment['character'] = best_match['character']
                
                # Align words
                if 'words' in segment and segment['words']:
                    new_segment['words'] = align_words(segment['words'], best_match['text'])
                
                corrected_segments.append(new_segment)
                used_entries.append(best_match)
            else:
                # Keep original segment if no match found
                corrected_segments.append(segment)
        
        # Create final result
        aligned_result = result.copy()
        aligned_result['segments'] = corrected_segments
        aligned_result['text'] = " ".join([seg['text'] for seg in corrected_segments])
        
        # Save to JSON
        timestamp_file = os.path.join(OUTPUT_DIR, "word_timestamps.json")
        with open(timestamp_file, "w", encoding='utf-8') as f:
            json.dump(aligned_result, f, indent=2)
        
        logger.info(f"Word timestamps saved to {timestamp_file}")
        return timestamp_file
    
    except Exception as e:
        logger.error(f"Error generating word timestamps: {str(e)}")
        return None

def generate_audio_worker(input_file_path, voices_dict):
    """Background worker to generate audio and update progress."""
    global generation_progress
    
    try:
        generation_progress.update({"is_generating": True, "progress": 5, "stage": "Parsing dialogue"})
        
        # Parse dialogue
        dialogue = generate_speech.parse_dialogue(input_file_path)
        if not dialogue:
            generation_progress.update({"stage": "Error: No dialogue parsed from input file", "is_generating": False})
            return False
        
        generation_progress.update({"progress": 10, "stage": "Processing voice samples"})
        
        # Process voices
        processed_voices = {}
        for character, voice in voices_dict.items():
            if voice.startswith("uploaded:"):
                file_path = os.path.join(UPLOAD_DIR, voice.split("uploaded:")[1])
            elif voice.startswith("default_voices/"):
                file_path = os.path.abspath(voice)
            else:
                logger.warning(f"Unrecognized voice format for {character}: {voice}. Skipping.")
                continue
                
            if os.path.exists(file_path):
                processed_voices[character] = file_path
                logger.info(f"Using voice for {character}: {file_path}")
            else:
                logger.warning(f"Voice file not found for {character}: {file_path}. Skipping.")

        # Check if any voices were processed
        if not processed_voices:
            logger.error("No valid voices were processed. Cannot generate speech.")
            generation_progress.update({"stage": "Error: No valid character voices found or processed.", "is_generating": False})
            return False
        
        # Calculate number of lines per character for progress tracking
        character_lines = {}
        for entry in dialogue:
            character = entry['character']
            character_lines[character] = character_lines.get(character, 0) + 1
                
        total_lines = len(dialogue)
        lines_processed = 0
        
        # Generate speech for each character
        generation_progress.update({"stage": "Generating speech"})
        time.sleep(0.5)  # Ensure frontend gets updated status
        
        for character, count in character_lines.items():
            logger.info(f"Generating speech for {character} ({count} lines)")
            
            # Get all lines for this character
            character_entries = [entry for entry in dialogue if entry['character'] == character]
            
            # Process each line
            for idx, entry in enumerate(character_entries):
                # Update progress proportionally based on lines processed
                lines_processed += 1
                progress_percent = 10 + ((lines_processed / total_lines) * 50)  # 10% to 60% progress
                generation_progress.update({
                    "progress": min(60, int(progress_percent)),
                    "stage": f"Generating speech for {character} ({idx+1}/{len(character_entries)} lines)"
                })
                
                logger.info(f"Progress: {generation_progress['progress']}%, Stage: {generation_progress['stage']}")
                
                # Skip characters without voices
                if character not in processed_voices:
                    logger.warning(f"No voice for character {character}, skipping line: {entry['line']}")
                    continue
                
                time.sleep(0.1)  # Allow progress updates to be retrieved
            
            # Update progress indicating we've completed this character
            character_progress = 60 + ((list(character_lines.keys()).index(character) + 1) / len(character_lines)) * 10
            generation_progress["progress"] = min(70, int(character_progress))
            time.sleep(0.1)
        
        # Generate audio for all dialogue
        generation_progress.update({"stage": "Generating final dialogue audio", "progress": 70})
        logger.info("Generating audio for all dialogue")
        time.sleep(0.5)
        
        generate_speech.generate_audio(dialogue, processed_voices, SPEECH_DIR)
        
        final_dialogue_path = os.path.join(SPEECH_DIR, "final_dialogue.wav")
        if not os.path.exists(final_dialogue_path):
            generation_progress.update({"stage": "Error: Final dialogue file not generated", "is_generating": False})
            return False
            
        # Download background music
        generation_progress.update({"stage": "Downloading background music", "progress": 80})
        logger.info("Downloading background music")
        time.sleep(0.5)
        
        # Handle background music
        use_bgm = True
        try:
            bgm_success = jamendo.main(BGM_FILE_PATH, input_file_path)
            
            if not bgm_success or not os.path.exists(BGM_FILE_PATH):
                default_bgm = "checkpoints_v2/default_bgm.mp3"
                
                if os.path.exists(default_bgm):
                    os.makedirs(os.path.dirname(BGM_FILE_PATH), exist_ok=True)
                    shutil.copy(default_bgm, BGM_FILE_PATH)
                else:
                    use_bgm = False
        except Exception as e:
            logger.error(f"Error with background music: {e}")
            use_bgm = False
            
        # Merge audio
        generation_progress.update({"stage": "Merging audio files", "progress": 90})
        logger.info("Merging audio files")
        time.sleep(0.5)
        
        try:
            if use_bgm and os.path.exists(BGM_FILE_PATH):
                merge_audio_bgm.merge_audio(final_dialogue_path, BGM_FILE_PATH, MERGED_SPEECH_BGM_OUTPUT)
            else:
                from pydub import AudioSegment
                output_dir = os.path.dirname(MERGED_SPEECH_BGM_OUTPUT)
                os.makedirs(output_dir, exist_ok=True)
                AudioSegment.from_wav(final_dialogue_path).export(MERGED_SPEECH_BGM_OUTPUT, format="mp3")
        except Exception as e:
            logger.error(f"Error merging audio: {e}")
            from pydub import AudioSegment
            output_dir = os.path.dirname(MERGED_SPEECH_BGM_OUTPUT)
            os.makedirs(output_dir, exist_ok=True)
            AudioSegment.from_wav(final_dialogue_path).export(MERGED_SPEECH_BGM_OUTPUT, format="mp3")
            
        # Finalize
        generation_progress.update({"stage": "Finalizing", "progress": 95})
        logger.info("Finalizing")
        time.sleep(0.5)
        
        if not os.path.exists(MERGED_SPEECH_BGM_OUTPUT):
            generation_progress.update({"stage": "Error: Failed to generate the final audio file", "is_generating": False})
            return False
        
        generation_progress.update({"stage": "Generating word timestamps", "progress": 95})
        timestamp_file = generate_word_timestamps(MERGED_SPEECH_BGM_OUTPUT)
        
        if not timestamp_file:
            logger.warning("Failed to generate word timestamps, continuing without them")
            
            
        time.sleep(0.5) 
        generation_progress.update({"progress": 100, "stage": "Complete"})
        logger.info("Audio generation complete")
        cleanup_temp_files()
        return True
        
    except Exception as e:
        logger.error(f"Error in generate_audio_worker: {str(e)}", exc_info=True)
        generation_progress["stage"] = f"Error: {str(e)}"
        return False
    finally:
        generation_progress["is_generating"] = False
        
@app.post("/generate-audio/")
async def generate_audio(input_file: UploadFile = File(...), character_voices: str = Form(...)):
    try:
        global generation_progress
        
        # Reset progress
        generation_progress = {
            "progress": 0,
            "stage": "Starting",
            "is_generating": True
        }
        
        logger.info(f"Received input_file: {input_file.filename}")
        logger.info(f"Received character_voices: {character_voices}")

        # Save uploaded input.txt
        if not os.path.exists(INPUT_TEXT_FILE_PATH):
            with open(INPUT_TEXT_FILE_PATH, "wb") as f:
                shutil.copyfileobj(input_file.file, f)
            logger.info(f"Wrote input file from the request")
        else:
            logger.info(f"Using existing input file: {INPUT_TEXT_FILE_PATH}")

        # Parse character_voices JSON
        try:
            voices_dict = json.loads(character_voices)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid character_voices format: {e}")

        # Start generation in a background thread
        thread = threading.Thread(
            target=generate_audio_worker,
            args=(INPUT_TEXT_FILE_PATH, voices_dict),
            daemon=True
        )
        thread.start()
        
        # Initial delay to let the worker start
        await asyncio.sleep(2)
        
        # Wait for generation to complete or timeout
        timeout = 2400  # 40 minutes timeout
        start_time = asyncio.get_event_loop().time()
        
        while generation_progress["is_generating"] and asyncio.get_event_loop().time() - start_time < timeout:
            await asyncio.sleep(1)
            
        if generation_progress["is_generating"]:
            generation_progress["stage"] = "Generation timed out"
            raise HTTPException(status_code=500, detail="Audio generation timed out")
            
        if not os.path.exists(MERGED_SPEECH_BGM_OUTPUT):
            raise HTTPException(status_code=500, detail="Failed to generate the final audio file.")

        logger.info(f"Returning file: {MERGED_SPEECH_BGM_OUTPUT}")
        return FileResponse(
            MERGED_SPEECH_BGM_OUTPUT, 
            filename="audiobook.mp3", 
            media_type="audio/mpeg"
        )

    except HTTPException as e:
        logger.error(f"HTTP error: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Internal server error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/upload-voice/")
async def upload_voice(file: UploadFile = File(...)):
    """Upload a voice sample file."""
    try:
        # Ensure filename is safe
        filename = Path(file.filename).name
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Ensure directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        logger.info(f"Voice sample uploaded: {file_path}")
        return {"filename": filename}
    except Exception as e:
        logger.error(f"Error uploading voice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload voice: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)