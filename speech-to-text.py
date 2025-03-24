# equired: Python 3.8 - 3.11 (using 3.10)
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
# pip install openai-whisper ffmpeg-python
# install ffmpeg from https://ffmpeg.org/download.html and add to paths


# ***** For Virtual Environment *****
# When done, deactivate it:
# deactivate

# To use it again later:
# cd C:\Users\SAKSHAM\Documents\my_project
# venv\Scripts\Activate.ps1



import whisper
import os

# Load the tiny model (32MB)
try:
    model = whisper.load_model("tiny")
except Exception as e:
    print(f"Error loading Whisper model: {e}")
    exit(1)  # Exit if the model fails to load

def speech_to_text(path):
    """Convert speech in an audio file to text and save it to output.txt."""
    try:
        # Check if the file exists
        if not os.path.isfile(path):
            raise FileNotFoundError(f"File '{path}' not found.")

        # Check file extension
        if not path.lower().endswith((".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm")):
            raise ValueError("Invalid file format. Supported formats: MP3, WAV, M4A, OGG, FLAC, WEBM.")

        # Transcribe the audio file
        result = model.transcribe(path)

        # Save the transcribed text to output.txt
        with open("output.txt", "w", encoding="utf-8") as file:
            file.write(result["text"])

        print("Transcription completed successfully. Check output.txt.")

    except FileNotFoundError as e:
        print(f"Error: {e}")
    except ValueError as e:
        print(f"Error: {e}")
    except RuntimeError as e:
        print(f"Runtime error: {e}")  # Catch Whisper-specific errors
    except Exception as e:
        print(f"Unexpected error: {e}")

# Ensure the script runs only when executed directly
if __name__ == "__main__":
    speech_to_text("audio.mp3")
