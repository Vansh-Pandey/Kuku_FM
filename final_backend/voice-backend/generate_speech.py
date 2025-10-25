# generate_speech.py

import os
import torch
import logging
import re
import numpy as np
import nltk
import time
import glob
from openvoice.api import ToneColorConverter
from melo.api import TTS
from scipy.io import wavfile

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Download NLTK resources
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger_eng')

# Configuration
torch.set_num_threads(10)
EMBEDDING_DIR = 'voice_embeddings'
CKPT_CONVERTER = 'checkpoints_v2/converter'
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
SPEECH_SPEED = 0.93

# Initialize tone color converter once
tone_color_converter = ToneColorConverter(f'{CKPT_CONVERTER}/config.json', device=DEVICE)
tone_color_converter.load_ckpt(f'{CKPT_CONVERTER}/checkpoint.pth')

def clean_voice_embeddings():
    """Remove all .pth files from the voice embeddings directory."""
    if os.path.exists(EMBEDDING_DIR):
        for file in os.listdir(EMBEDDING_DIR):
            if file.endswith('.pth'):
                try:
                    os.remove(os.path.join(EMBEDDING_DIR, file))
                    logger.info(f"Removed existing embedding: {file}")
                except Exception as e:
                    logger.error(f"Failed to remove embedding {file}: {e}")
    else:
        os.makedirs(EMBEDDING_DIR, exist_ok=True)
        logger.info(f"Created embeddings directory: {EMBEDDING_DIR}")

def get_latest_embedding(character_name):
    """Get the most recent embedding file for a character."""
    base_name = character_name.lower().replace(' ', '_')
    pattern = os.path.join(EMBEDDING_DIR, f"{base_name}_*.pth")
    
    # Find all matching embedding files
    embedding_files = glob.glob(pattern)
    
    if not embedding_files:
        return None
    
    # Sort by modification time (newest first)
    embedding_files.sort(key=os.path.getmtime, reverse=True)
    
    return embedding_files[0]

def parse_dialogue(file_path):
    """Parse the input file and extract character dialogue."""
    try:
        # Try UTF-8 first, fallback to latin-1
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except UnicodeDecodeError:
            logger.warning(f"Failed to decode {file_path} with UTF-8. Trying with 'latin-1'.")
            with open(file_path, 'r', encoding='latin-1') as f:
                text = f.read()
        
        logger.info(f"Loaded input text: {len(text)} characters")
        
        # Find dialogue patterns: <Character> <optional_mood> "Dialogue"
        # Updated pattern to capture dialogue until the next character tag or end of text
        pattern = r'(?:^|\n)<([^>]+)>\s*(?:<([^>]+)>)?\s*"(.*?)(?="(?:\s*\n<|$))'
        matches = re.findall(pattern, text, re.DOTALL)
        
        logger.info(f"Found {len(matches)} dialogue entries")
        
        dialogue = []
        for character, mood, line in matches:
            character = character.strip()
            line = line.strip()
            
            if line:  # Skip empty lines
                entry = {'character': character, 'line': line}
                if mood:
                    entry['mood'] = mood.strip()
                dialogue.append(entry)
                logger.info(f"Added: {character}: {line[:30]}...")
        
        return dialogue
    except Exception as e:
        logger.error(f"Error parsing dialogue: {e}", exc_info=True)
        return []

def process_character_voices(character_voices):
    """Process character voices into embeddings."""
    from openvoice import se_extractor
    
    os.makedirs(EMBEDDING_DIR, exist_ok=True)
    processed_voices = {}
    
    for character, path in character_voices.items():
        base_name = character.lower().replace(' ', '_')
        
        # For all characters, create timestamped embedding files
        if path.endswith(('.mp3', '.wav')):
            # Create timestamped embedding file
            timestamp = int(time.time())
            embedding_path = f'{EMBEDDING_DIR}/{base_name}_{timestamp}.pth'
            
            logger.info(f"Generating new embedding for {character} from {path}")
            try:
                target_se, _ = se_extractor.get_se(path, tone_color_converter, vad=True)
                torch.save(target_se, embedding_path)
                processed_voices[character] = embedding_path
                logger.info(f"Successfully generated new embedding for {character}")
            except Exception as e:
                logger.error(f"Failed to generate embedding for {character}: {e}")
                continue
        elif path.endswith('.pth'):
            # If an embedding path is provided directly, use it
            if os.path.exists(path):
                processed_voices[character] = path
                logger.info(f"Using provided embedding file for {character}")
            else:
                logger.warning(f"Embedding file {path} not found for {character}")
        else:
            # For characters without new audio, use their latest embedding
            latest_embedding = get_latest_embedding(character)
            if latest_embedding:
                processed_voices[character] = latest_embedding
                logger.info(f"Using latest embedding for {character}: {latest_embedding}")
            else:
                logger.warning(f"No embedding found for {character}")
    
    return processed_voices

def generate_audio(dialogue, character_voices, output_dir='outputs_v2'):
    """Generate audio for each dialogue line and concatenate them."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Process voices and generate embeddings if needed
    processed_voices = process_character_voices(character_voices)
    
    if not processed_voices:
        logger.error("No valid character voices. Exiting.")
        return
    
    # Initialize TTS model
    model = TTS(language='EN', device=DEVICE)
    speaker_ids = model.hps.data.spk2id
    base_speaker = list(speaker_ids.keys())[0].lower().replace('_', '-')
    source_se = torch.load(f'checkpoints_v2/base_speakers/ses/{base_speaker}.pth', map_location=DEVICE)
    
    audio_segments = []
    total_lines = len(dialogue)
    
    for idx, entry in enumerate(dialogue):
        character = entry['character']
        text = entry['line']
        
        logger.info(f"Processing [{idx+1}/{total_lines}] {character}: {text[:30]}...")
        
        if character not in processed_voices:
            logger.warning(f"No voice embedding found for {character}, skipping")
            continue
        
        target_se = torch.load(processed_voices[character], map_location=DEVICE)
        tmp_path = f'{output_dir}/tmp_{character}.wav'
        output_path = f'{output_dir}/output_{character}_{len(audio_segments)}.wav'
        
        try:
            # Generate base audio
            base_speaker_key = list(speaker_ids.keys())[0]
            model.tts_to_file(text, speaker_ids[base_speaker_key], tmp_path, speed=SPEECH_SPEED)
            
            # Apply voice conversion
            tone_color_converter.convert(
                audio_src_path=tmp_path,
                src_se=source_se,
                tgt_se=target_se,
                output_path=output_path,
                message="@MyShell"
            )
            
            # Add to segments
            sample_rate, audio_data = wavfile.read(output_path)
            audio_segments.append(audio_data)
            logger.info(f"Added audio segment: {len(audio_data)} samples")
            
        except Exception as e:
            logger.error(f"Failed to process audio for {character}: {e}")
    
    if not audio_segments:
        logger.error("No audio segments generated.")
        return
    
    # Merge all segments
    final_audio = np.concatenate(audio_segments)
    final_path = f'{output_dir}/final_dialogue.wav'
    
    try:
        wavfile.write(final_path, sample_rate, final_audio)
        logger.info(f"Final audio saved: {final_path}, length: {len(final_audio)} samples")
    except Exception as e:
        logger.error(f"Failed to save final audio: {e}")

def save_speaker_embedding(audio_path, output_name, force_new=False):
    """
    Save speaker embedding from an audio file.
    
    Args:
        audio_path (str): Path to the reference audio file
        output_name (str): Name for the embedding file
        force_new (bool): Whether to force creating a new embedding
    Returns:
        str: Path to the embedding file
    """
    os.makedirs(EMBEDDING_DIR, exist_ok=True)
    output_path = f'{EMBEDDING_DIR}/{output_name}.pth'
    
    # Check if embedding already exists and we're not forcing a new one
    if os.path.exists(output_path) and not force_new:
        logger.info(f"Using existing embedding for {output_name}")
        return output_path
    
    # Extract speaker embedding
    from openvoice import se_extractor
    logger.info(f"Generating new embedding for {output_name} from {audio_path}")
    try:
        target_se, _ = se_extractor.get_se(audio_path, tone_color_converter, vad=True)
        torch.save(target_se, output_path)
        logger.info(f"Successfully generated embedding for {output_name}")
        return output_path
    except Exception as e:
        logger.error(f"Failed to generate embedding for {output_name}: {e}")
        return None

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate speech for dialogue')
    parser.add_argument('--input', type=str, default='input.txt', help='Input text file path')
    parser.add_argument('--output', type=str, default='outputs_v2', help='Output directory')
    parser.add_argument('--new-story', action='store_true', help='Whether this is a new story (to clear old embeddings)')
    args = parser.parse_args()
    
    character_voices = {
        'Narrator': "C:/Users/SAKSHAM/Downloads/sampledats/mrs2.mp3",
        'Elder Wren': 'C:/Users/SAKSHAM/Downloads/sampledats/elder_wren.mp3',
        'Lila': 'C:/Users/SAKSHAM/Downloads/sampledats/lila.mp3',
        'Milo': 'C:/Users/SAKSHAM/Downloads/sampledats/milo.mp3',
        'Character': 'C:/Users/SAKSHAM/Downloads/sampledats/character.mp3'
    }
    
    dialogue = parse_dialogue(args.input)
    generate_audio(dialogue, character_voices, args.output, force_new_embeddings=args.new_story)