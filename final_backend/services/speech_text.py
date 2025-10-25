import whisper
import os
import tempfile
from fastapi import HTTPException
from typing import Optional

class SpeechToText:
    def __init__(self, model_size: str = "tiny"):
        try:
            self.model = whisper.load_model(model_size)
        except Exception as e:
            raise RuntimeError(f"Error loading Whisper model: {e}")

    async def transcribe_audio(self, audio_file) -> str:
        """Convert speech in an audio file to text"""
        try:
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as tmp_file:
                # Save uploaded file to temp location
                contents = await audio_file.read()
                tmp_file.write(contents)
                tmp_path = tmp_file.name

            # Check file extension
            valid_extensions = (".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm")
            if not tmp_path.lower().endswith(valid_extensions):
                raise HTTPException(status_code=400, detail="Invalid file format. Supported formats: MP3, WAV, M4A, OGG, FLAC, WEBM.")

            # Transcribe the audio file
            result = self.model.transcribe(tmp_path)

            # Clean up temporary file
            try:
                os.unlink(tmp_path)
            except:
                pass

            return result["text"]

        except Exception as e:
            # Clean up temporary file if it exists
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except:
                    pass
            raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

# Initialize the speech-to-text processor with the tiny model
speech_processor = SpeechToText(model_size="tiny")