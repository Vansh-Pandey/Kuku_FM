from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from services.generate_story import generate_story
from services.line_tagging import analyze_and_tag_story
from pydantic import BaseModel
import os
import json
from dotenv import load_dotenv
from services.speech_text import speech_processor  # Import the speech processor

load_dotenv()

# Change this to use GEMINI_API_KEY
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# CORS configuration (unchanged)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StoryRequest(BaseModel):
    genre: str
    length: str
    context: str = ""

class VoiceRequest(BaseModel):
    tagged_story: str

@app.post("/generate-story")
async def create_story(request: StoryRequest):
    try:
        # Generate the story
        print("Gone to story generation")
        os.environ["HTTP_PROXY"] = ""
        os.environ["HTTPS_PROXY"] = ""
        story = generate_story(
            genre=request.genre,
            length=request.length,
            context=request.context,
            api_key=OPENAI_API_KEY  # Changed to use Gemini key
        )
        if not story:
            raise ValueError("Story generation failed")

        print(story)
        tagged_story = analyze_and_tag_story(story, api_key=OPENAI_API_KEY)  # Changed to use Gemini key
        if tagged_story is None:
            raise ValueError("Story tagging failed")

        return {
            "status": "success",
            "story": story,
            "tagged_story": tagged_story,
        }
    
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))  # More detailed error

@app.post("/generate-voice")
async def generate_voice(request: VoiceRequest):
    try:
        os.environ["HTTP_PROXY"] = ""
        os.environ["HTTPS_PROXY"] = ""
        tagged_story = request.tagged_story
        if not tagged_story:
            raise ValueError("No tagged story provided")
        
        voice_segments = []
        for line in tagged_story.split('\n'):
            if not line.strip():
                continue
                
            try:
                # Split on the first quote to separate tags and text
                tag_part, dialogue_text = line.split('"', 1)
                dialogue_text = dialogue_text.rstrip('"')
                
                # Extract character and emotion from tags
                tags = tag_part.split('>')
                character = tags[0][1:]  # Remove leading '<'
                emotion = tags[1][1:] if len(tags) > 2 else "neutral"
                
                voice_segments.append({
                    "character": character,
                    "emotion": emotion,
                    "text": dialogue_text,
                    "audio_url": f"generated_audio/{character}_{emotion}_{hash(dialogue_text)}.mp3"
                })
            except Exception as e:
                print(f"Error parsing line '{line}': {e}")
                continue
        
        if not voice_segments:
            raise ValueError("No valid voice segments generated")
        
        return {
            "status": "success",
            "voice_segments": voice_segments,
            "message": "Voice generation queued successfully",
            "redirect_url": "/audio"
        }
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add new endpoint for speech-to-text
@app.post("/transcribe-audio")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """Endpoint for converting speech to text"""
    try:
        # Validate file size (e.g., 10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        contents = await audio_file.read()
        if len(contents) > max_size:
            raise HTTPException(status_code=413, detail="File too large (max 10MB)")
        
        # Reset file pointer after reading
        await audio_file.seek(0)
        
        # Process the audio file
        transcribed_text = await speech_processor.transcribe_audio(audio_file)
        
        return {
            "status": "success",
            "text": transcribed_text
        }
    
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")