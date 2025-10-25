# merge_audio_bgm.py
from pydub import AudioSegment
from pydub.silence import detect_nonsilent
import math # Required for ceiling division in looping calculation

def merge_audio(
    narrator_path,
    bgm_path,
    output_path,
    bgm_volume_reduction_during_speech=-22, # dB reduction when speech IS present (make it quieter)
    bgm_volume_reduction_during_silence=-12,  # dB reduction when speech IS NOT present (make it louder)
    min_silence_len=200, # ms - minimum length of silence in narrator to trigger louder BGM
    silence_thresh=-32,  # dBFS - audio level below which is considered silence (tune this!)
    fade_duration=100    # ms - duration for fade in/out of BGM volume change
):
    """
    Merges narrator audio with background music, dynamically adjusting
    BGM volume based on the presence of speech (audio ducking).

    Args:
        narrator_path (str): Path to the narrator audio file (e.g., WAV).
        bgm_path (str): Path to the background music file (e.g., MP3).
        output_path (str): Path to save the merged audio file (e.g., MP3).
        bgm_volume_reduction_during_speech (float): dB reduction applied to BGM
                                                     during speech segments. Default -18 dB.
        bgm_volume_reduction_during_silence (float): dB reduction applied to BGM
                                                      during silent segments. Default -9 dB.
        min_silence_len (int): Minimum duration (in ms) in the narrator track
                               to be considered silence for ducking purposes. Default 500ms.
        silence_thresh (float): Audio level (in dBFS) below which the narrator
                                track is considered silent. Needs tuning based
                                on narrator recording quality and noise floor. Default -40 dBFS.
        fade_duration (int): Duration (in ms) for crossfading BGM volume changes
                             to make transitions smoother. Default 150ms.
    """
    print("Loading audio files...")
    narrator = AudioSegment.from_file(narrator_path)
    bgm = AudioSegment.from_file(bgm_path)
    narrator_len = len(narrator)

    print("Adjusting BGM length...")
    # Ensure BGM is at least as long as the narrator track by looping/trimming
    if len(bgm) < narrator_len:
        # Calculate how many times bgm needs to loop (using ceiling division)
        loops_needed = math.ceil(narrator_len / len(bgm))
        looped_bgm = bgm * loops_needed
        # Trim to match narrator length exactly
        bgm_adjusted_length = looped_bgm[:narrator_len]
        print(f"BGM looped {loops_needed} times and trimmed to {narrator_len} ms.")
    else:
        # If bgm is longer, just trim it
        bgm_adjusted_length = bgm[:narrator_len]
        print(f"BGM trimmed to {narrator_len} ms.")

    # --- Create two versions of the BGM ---
    # 1. BGM Quieter (for when speech is present)
    bgm_quiet = bgm_adjusted_length.apply_gain(bgm_volume_reduction_during_speech)
    # 2. BGM Louder (for when speech is absent)
    bgm_louder = bgm_adjusted_length.apply_gain(bgm_volume_reduction_during_silence)

    print("Detecting non-silent (speech) parts in narrator audio...")
    # Parameters might need tuning based on your specific narrator audio:
    # - min_silence_len: Increase if BGM fluctuates too much between short pauses.
    # - silence_thresh: Adjust based on the noise floor of your narrator recording.
    #   If background noise in narrator track is detected as speech, make threshold lower (e.g., -45, -50).
    #   If quiet speech is detected as silence, make threshold higher (e.g., -35, -30).
    nonsilent_ranges = detect_nonsilent(
        narrator,
        min_silence_len=min_silence_len,
        silence_thresh=silence_thresh,
        seek_step=1 # Check every millisecond
    )

    if not nonsilent_ranges:
        print("Warning: No speech detected in narrator track. Applying 'silence' volume reduction to entire BGM.")
        # If no speech is detected, just use the 'louder' BGM version throughout
        final_bgm = bgm_louder
    else:
        print(f"Detected {len(nonsilent_ranges)} speech segments. Building dynamic BGM...")
        # Start with the 'louder' BGM version
        final_bgm = bgm_louder
        fade_half = fade_duration // 2

        for start_time, end_time in nonsilent_ranges:
            # Ensure fade doesn't go out of bounds
            fade_start = max(0, start_time - fade_half)
            fade_end = min(narrator_len, end_time + fade_half)
            
            # Get the segment from the 'quiet' BGM corresponding to the speech segment + fades
            quiet_segment = bgm_quiet[fade_start:fade_end]

            # Before overlaying, create fades for the quiet segment
            # Fade in the beginning of the quiet segment
            quiet_segment = quiet_segment.fade_in(fade_duration)
            # Fade out the end of the quiet segment
            # Make sure not to fade if it's already at the very end of the audio
            if fade_end < narrator_len:
                 quiet_segment = quiet_segment.fade_out(fade_duration)


            # Overlay the faded quiet segment onto the 'louder' BGM base
            # The `position` parameter ensures it's placed at the correct time
            final_bgm = final_bgm.overlay(quiet_segment, position=fade_start)
            
            # Optional: Print progress for long files
            # print(f"  Applied quieter BGM from {fade_start}ms to {fade_end}ms")


    print("Overlaying narrator onto the final dynamic BGM...")
    # Overlay the original narrator track onto the dynamically adjusted BGM
    merged_audio = narrator.overlay(final_bgm)

    print(f"Exporting final audio to {output_path}...")
    merged_audio.export(output_path, format="mp3")
    print(f"Audio merged successfully with dynamic BGM volume and saved to {output_path}")

# --- Main execution block ---
if __name__ == "__main__":
    merge_audio(
        narrator_path="outputs/speech/final_dialogue.wav",
        bgm_path="background_music.mp3",
        output_path="output_merged_ai.mp3",
        bgm_volume_reduction_during_speech=-50, # BGM quieter during speech
        bgm_volume_reduction_during_silence=-30,  # BGM louder during silence
        min_silence_len=200,                     # Minimum pause length (ms)
        silence_thresh=-30,                      # Silence threshold (dBFS) - TUNE THIS!
        fade_duration=100                        # Volume change fade time (ms)
    )
    
    