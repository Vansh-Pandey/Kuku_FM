# save_embeddings.py

import os
import torch
from openvoice import se_extractor
from openvoice.api import ToneColorConverter

# Configuration
torch.set_num_threads(10)
ckpt_converter = 'checkpoints_v2/converter'
device = "cuda:0" if torch.cuda.is_available() else "cpu"
embedding_dir = 'voice_embeddings'

# Initialize tone color converter
tone_color_converter = ToneColorConverter(f'{ckpt_converter}/config.json', device=device)
tone_color_converter.load_ckpt(f'{ckpt_converter}/checkpoint.pth')

# Create embedding directory if it doesn't exist
os.makedirs(embedding_dir, exist_ok=True)

def save_speaker_embedding(audio_path, output_name):
    """
    Save speaker embedding from an audio file if it doesn't already exist.
    
    Args:
        audio_path (str): Path to the reference audio file
        output_name (str): Name for the embedding file (e.g., 'narrator', 'mrs_dursley')
    Returns:
        str: Path to the embedding file
    """
    output_path = f'{embedding_dir}/{output_name}.pth'
    
    # Check if embedding already exists
    if os.path.exists(output_path):
        print(f"Embedding for {output_name} already exists at {output_path}")
        return output_path
    
    # Extract speaker embedding
    target_se, audio_name = se_extractor.get_se(audio_path, tone_color_converter, vad=True)
    
    # Save the embedding
    torch.save(target_se, output_path)
    print(f"Saved new embedding for {output_name} at {output_path}")
    return output_path

if __name__ == "__main__":
    # Example usage: Add your audio files and desired names here
    voices = [
        ("C:/Users/SAKSHAM/Downloads/sampledats/nar.mp3", "narrator"),
        ("C:/Users/SAKSHAM/Downloads/sampledats/mrs2.mp3", "mrs_dursley"),
        ("C:/Users/SAKSHAM/Downloads/sampledats/mr2.mp3", "mr_dursley"),
    ]
    
    for audio_path, name in voices:
        save_speaker_embedding(audio_path, name)