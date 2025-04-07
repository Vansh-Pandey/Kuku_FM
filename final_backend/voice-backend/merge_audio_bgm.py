# merge_audio_bgm.py

from pydub import AudioSegment

def merge_audio(narrator_path, bgm_path, output_path, bgm_volume_reduction=-11):
    # Load the narrator and background music
    narrator = AudioSegment.from_file(narrator_path)
    bgm = AudioSegment.from_file(bgm_path)

    # Reduce the volume of the background music
    bgm = bgm.apply_gain(bgm_volume_reduction)

    # Adjust bgm length to match or exceed narrator length by looping if necessary
    if len(bgm) < len(narrator):
        # Calculate how many times bgm needs to loop fully
        loops_needed = (len(narrator) // len(bgm)) + 1
        # Create looped bgm by concatenating it multiple times
        looped_bgm = bgm * loops_needed
        # Trim to match narrator length exactly
        bgm = looped_bgm[:len(narrator)]
    else:
        # If bgm is longer, just trim it
        bgm = bgm[:len(narrator)]

    # Merge the audio
    merged_audio = narrator.overlay(bgm)

    # Export the final audio
    merged_audio.export(output_path, format="mp3")
    print(f"Audio merged and saved to {output_path}")

if __name__ == "__main__":
    merge_audio("outputs/speech/final_dialogue.wav", "background_music.mp3", "output_merged_ai.mp3")