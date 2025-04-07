import requests
import random
import os
from openai import OpenAI
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
JAMENDO_API_KEY = os.getenv("JAMENDO_API_KEY")

def fetch_music_by_emotion(emotion, api_key):
    """Fetch music from Jamendo API based on an emotion tag."""
    try:
        # Map common emotions to Jamendo tags
        emotion_map = {
            "happy": "happy",
            "sad": "sad",
            "angry": "angry",
            "fear": "dark",
            "tense": "dark",
            "calm": "relaxing",
            "peaceful": "relaxing",
            "joy": "happy",
            "excitement": "upbeat",
            "love": "romantic",
            "nostalgic": "nostalgic",
            "mysterious": "mysterious",
            "hopeful": "inspirational"
        }
        
        # Use mapped emotion or original if not in map
        jamendo_tag = emotion_map.get(emotion.lower(), emotion.lower())
        
        logger.info(f"Fetching music for emotion: {emotion} (using tag: {jamendo_tag})")
        URL = f"https://api.jamendo.com/v3.0/tracks/?client_id={api_key}&format=json&limit=10&tags={jamendo_tag}"
        response = requests.get(URL, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data["headers"]["results_count"] > 0:
            songs = data["results"]
            random_song = random.choice(songs)
            # Prefer audio_download if available, otherwise use audio
            audio_url = random_song.get("audio_download", random_song.get("audio"))
            return audio_url, random_song["name"], random_song["artist_name"]
        else:
            logger.warning(f"No tracks found for emotion: {jamendo_tag}")
    except requests.RequestException as e:
        logger.error(f"Error fetching music for {emotion}: {e}")
    return None, None, None

def detect_emotions_from_text(file_path, openai_api_key):
    """Detect the dominant emotion from the text file."""
    try:
        # Try UTF-8 first
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                text = file.read()
        except UnicodeDecodeError:
            # Fallback to latin-1
            logger.info("Falling back to latin-1 encoding")
            with open(file_path, "r", encoding="latin-1") as file:
                text = file.read()
        
        prompt = f"Analyze this text and return the single most dominant emotion (e.g., happy, sad, tense, calm) as a single word: {text[:1000]}"
        
        try:
            client = OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # Using gpt-3.5-turbo as fallback if gpt-4 isn't available
                messages=[
                    {"role": "system", "content": "You are an AI assistant specializing in emotion analysis."},
                    {"role": "user", "content": prompt}
                ]
            )
            emotion = response.choices[0].message.content.strip().lower()
            logger.info(f"Detected emotion: {emotion}")
            return emotion
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            logger.info("Using fallback emotion: calm")
            return "calm"
            
    except FileNotFoundError:
        logger.error(f"Error: File {file_path} not found.")
        return None
    except Exception as e:
        logger.error(f"Error detecting emotions: {e}")
        return None

def download_audio(audio_url, output_path):
    """Download audio from URL to output path."""
    if not audio_url:
        logger.error("No valid audio URL provided.")
        return False
    try:
        response = requests.get(audio_url, stream=True, timeout=10)
        response.raise_for_status()
        with open(output_path, "wb") as file:
            for chunk in response.iter_content(chunk_size=1024):
                file.write(chunk)
        logger.info(f"Audio downloaded: {output_path}")
        return True
    except requests.RequestException as e:
        logger.error(f"Failed to download audio: {e}")
        return False

def main(output_path="background_music.mp3", file_path="input.txt"):
    """Main function to get background music based on the text's emotion."""
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    
    # Check API keys
    if not OPENAI_API_KEY:
        logger.warning("Missing OpenAI API key. Using fallback emotion: calm")
        emotion = "calm"
    elif not JAMENDO_API_KEY:
        logger.warning("Missing Jamendo API key. Cannot fetch music.")
        return False
    else:
        # Detect the dominant emotion
        emotion = detect_emotions_from_text(file_path, OPENAI_API_KEY)
        
    if not emotion:
        logger.warning("No emotion detected. Using fallback: calm")
        emotion = "calm"  # Fallback emotion

    # If API key is missing, use fallback
    if not JAMENDO_API_KEY:
        logger.error("Missing Jamendo API key. Cannot proceed.")
        return False
        
    # Check if output file already exists
    if os.path.exists(output_path):
        logger.info(f"Using existing file: {output_path}")
        return True

    # Fetch and download music for the detected emotion
    audio_url, title, artist = fetch_music_by_emotion(emotion, JAMENDO_API_KEY)
    if audio_url:
        logger.info(f"Downloading: {title} by {artist} for {emotion}")
        return download_audio(audio_url, output_path)
    else:
        logger.warning(f"No suitable music found for {emotion}. Using fallback.")
        # Try a fallback emotion
        audio_url, title, artist = fetch_music_by_emotion("calm", JAMENDO_API_KEY)
        if audio_url:
            logger.info(f"Downloading fallback: {title} by {artist} for 'calm'")
            return download_audio(audio_url, output_path)
        else:
            logger.warning("No fallback music available.")
            return False

if __name__ == "__main__":
    main()