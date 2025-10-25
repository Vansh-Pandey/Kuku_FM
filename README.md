# Audiobook Generator 🎧

A powerful audiobook creation platform that combines advanced text-to-speech, voice cloning, and background music integration to create professional-grade audiobooks.

![Audiobook Generator Demo]https://app.presentations.ai/view/6WFHvx
*Replace with actual screenshot from your presentation*

## Features ✨

- 🎙️ High-quality text-to-speech using MeloTTS and OpenVoice V2
- � Voice cloning and customization
- 🎵 Background music integration from Jamendo
- 📝 AI-powered story generation with OpenAI API
- 🗣️ Speech-to-text transcription with OpenAI Whisper
- 🖥️ Modern React frontend with Three.js animations
- ⚡ Fast backend processing with Python

## Tech Stack 🛠️

**Frontend:**
- React
- Three.js
- Vite

**Backend:**
- Python
- FastAPI
- OpenAI API
- Whisper (STT)
- MeloTTS
- OpenVoice V2
- FFmpeg
- PyDub

## Installation & Setup 🚀

### Prerequisites
- Node.js (v16+)
- Python (v3.10+)
- FFmpeg
- OpenAI API key

### Frontend Setup
```bash
cd final_frontend
npm install
npm run dev

backend setup:
cd final_backend
# Create .env file with your OpenAI API key
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

voice backend setup:
cd final_backend/voice-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Download and extract checkpoints:
# https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_1226.zip
# https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_v2_0417.zip

pip install -r requirements.txt
pip install git+https://github.com/myshell-ai/MeloTTS.git
python -m unidic download

uvicorn backend_main:app --reload

Project Structure 
final_kuku/
├── final_frontend/          # React frontend
│   ├── public/              # Static assets
│   ├── src/                 # Source code
│   │   ├── assets/          # Images, SVGs
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # State management
│   │   └── ...              # Other frontend files
│   └── ...
├── final_backend/           # Python backend
│   ├── services/            # API services
│   ├── stories/             # Generated stories
│   ├── voice-backend/       # Voice processing
│   │   ├── default_voices/  # Preloaded voice samples
│   │   ├── openvoice/       # OpenVoice implementation
│   │   ├── outputs/         # Generated audio files
│   │   └── ...              # Other voice processing files
│   └── ...
└── ...
