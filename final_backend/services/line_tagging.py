import google.generativeai as genai
import time
import os
from dotenv import load_dotenv

load_dotenv()

def analyze_and_tag_story(
    story: str,
    api_key: str = os.getenv("GEMINI_API_KEY"),
    model: str = "gemini-1.5-pro-latest"
) -> str:
    """Processes a story to tag characters, narration, and emotions in each line.
    Saves the tagged result in a file and returns the tagged content as a string.
    Returns None if something fails."""
    
    try:
        genai.configure(api_key=api_key)

        lines = [line.strip() for line in story.split("\n") if line.strip()]
        if not lines:
            raise ValueError("Empty story input")
        
        results = []
        total_lines = len(lines)
        
        for i, line in enumerate(lines, 1):
            print(f"Processing line {i}/{total_lines}: {line[:50]}...")

            # Handle title/formatting lines
            if line.startswith("**") and line.endswith("**"):
                results.append(f"<Narrator><title>\"{line}\"")
                print(f"✓ Processed line {i} as title")
                continue
            
            line_result = None
            for attempt in range(3):
                try:
                    prompt = (
                        "Analyze this story line with 100% accuracy. Follow these rules EXACTLY:\n"
                        "1. CHARACTER: Use <Narrator> for narration or exact character names (never 'Unknown')\n"
                        "2. EMOTION: Tag one dominant emotion from: <neutral>, <joy>, <fear>, <anger>, <sadness>, <suspense>\n"
                        "3. FORMAT: <Character><emotion>\"text\" (NO EXTRA TEXT)\n"
                        "4. For chapter titles/formatting: <Narrator><title>\"text\"\n\n"
                        f"LINE TO ANALYZE: \"{line}\""
                    )

                    model = genai.GenerativeModel('gemini-pro')
                    response = model.generate_content(
                        contents=[
                            {
                                "role": "user",
                                "parts": [{
                                    "text": (
                                        "You are a story tagging AI that follows rules EXACTLY. "
                                        "Only respond with the required format: <Character><emotion>\"text\""
                                    )
                                }]
                            },
                            {
                                "role": "user",
                                "parts": [{
                                    "text": prompt
                                }]
                            }
                        ],
                        # temperature=0,
                        generation_config={
                            "max_output_tokens": 100
                        }
                    )

                    line_result = response.text.strip()

                    if not (line_result.startswith('<') and '>' in line_result and '"' in line_result):
                        raise ValueError("Invalid format received")

                    break  # Success

                except Exception as e:
                    if attempt == 2:
                        print(f"! Critical error on line {i}: {str(e)}")
                        line_result = f"<Narrator><neutral>\"{line}\""
                    else:
                        time.sleep(2 ** attempt)

            results.append(line_result)
            print(f"✓ Processed line {i}: {line_result[:50]}...")

            # Basic rate limiting
            if i % 5 == 0:
                time.sleep(1.5)

        # Combine all lines into one result
        analysis = "\n".join(results)
        print(f"\nSuccessfully processed {len(results)}/{total_lines} lines")

        # Save the result to a file
        os.makedirs("stories", exist_ok=True)
        timestamp = int(time.time())
        filename = f"stories/tagged_story_{timestamp}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(analysis)
        print(f"Tagged story saved to {filename}")

        return analysis

    except Exception as e:
        print(f"Error in story analysis: {str(e)}")
        os.makedirs("stories", exist_ok=True)
        with open("stories/tagging_error.log", "w", encoding="utf-8") as f:
            f.write(f"Error: {str(e)}\n\nInput story (first 1000 chars):\n{story[:1000]}...")
        return None