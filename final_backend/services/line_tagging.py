import openai  
import time
import os
from dotenv import load_dotenv

load_dotenv()

def analyze_and_tag_story(
    story: str,
    api_key: str = os.getenv("OPENAI_API_KEY"),   
    model_name: str = "gpt-4"   
) -> str:
    """Processes a story to tag characters, narration, and emotions in each line.
    Saves the tagged result in a file and returns the tagged content as a string.
    Returns None if something fails."""
    
    try:
        openai.api_key = api_key   

        lines = [line.strip() for line in story.split("\n") if line.strip()]
        if not lines:
            raise ValueError("Empty story input")
        
        results = []
        total_lines = len(lines)
        
        # First, scan the story to extract potential character names
        story_text = "\n".join(lines)
        potential_characters = []
        
        try:
            character_scan_prompt = (
                "Extract ALL character names from this story excerpt. Only respond with a comma-separated list of names.\n"
                "Look for:\n"
                "1. Names in dialogue tags (e.g., \"Hello,\" said John)\n"
                "2. Names mentioned in conversation\n"
                "3. Names of anyone performing actions\n\n"
                f"STORY EXCERPT:\n{story_text}"  
            )
            
            char_response = openai.ChatCompletion.create(  
                model=model_name,
                messages=[
                    {"role": "system", "content": "You are a character name extractor. Only respond with a comma-separated list of names."},
                    {"role": "user", "content": character_scan_prompt}
                ],
                temperature=0.2,
                max_tokens=150
            )
            potential_characters = [name.strip() for name in char_response.choices[0].message.content.split(',')]
            print(f"Identified potential characters: {potential_characters}")
        except Exception as e:
            print(f"Warning: Character scan failed: {e}. Proceeding with standard processing.")
        
        # Process each line
        for i, line in enumerate(lines, 1):
            print(f"Processing line {i}/{total_lines}: {line[:50]}...")

            # Handle title/formatting lines
            if line.startswith("**") and line.endswith("**"):
                results.append(f"<Narrator><title>\"{line}\"")
                print(f"✓ Processed line {i} as title")
                continue
            
            # Analyze for dialogue patterns directly in code
            character_name = "Narrator"
            emotion = "neutral"
            
            # Simple dialogue detection
            if '"' in line:
                # Check for dialogue attribution patterns like "text," said Character
                dialogue_parts = line.split('"')
                
                if len(dialogue_parts) >= 3:
                    after_quote = dialogue_parts[2].strip()
                    
                    # Check dialogue attribution patterns
                    for char in potential_characters:
                        if char in after_quote and any(word in after_quote.lower() for word in ["said", "asked", "replied", "whispered", "shouted", "exclaimed"]):
                            character_name = char
                            break
                     
                    if character_name == "Narrator":
                        for char in potential_characters:
                            if line.startswith(char):
                                character_name = char
                                break
                
                # Basic emotion detection
                text = line.lower()
                if any(word in text for word in ["happy", "laugh", "smile", "joy", "grin", "delighted"]):
                    emotion = "joy"
                elif any(word in text for word in ["afraid", "fear", "terrified", "scared", "trembling"]):
                    emotion = "fear"  
                elif any(word in text for word in ["angry", "furious", "rage", "yelled", "snapped"]):
                    emotion = "anger"
                elif any(word in text for word in ["sad", "tears", "cried", "sorrow", "grief"]):
                    emotion = "sadness"
                elif any(word in text for word in ["suspense", "tense", "uncertain", "waited"]):
                    emotion = "suspense"
            
            # Try to use the AI for better analysis, with fallback to our basic detection
            line_result = None
            for attempt in range(3):
                try:
                    # Enhanced prompt
                    prompt = (
                        "Analyze this story line to identify characters and emotions. Follow these rules EXACTLY:\n\n"
                        "1. CHARACTER IDENTIFICATION:\n"
                        "   - Use <Narrator> ONLY for narration that isn't dialogue or a character's thoughts\n"
                        "   - For dialogue, identify the specific character speaking\n"
                        f"   - Potential characters in this story include: {', '.join(potential_characters) if potential_characters else 'to be determined'}\n"
                        "   - Look for dialogue indicators like quotation marks, said/asked/replied, or changes in perspective\n\n"
                        "2. EMOTION TAGGING:\n"
                        "   - Tag the dominant emotion from: <neutral>, <joy>, <fear>, <anger>, <sadness>, <suspense>\n"
                        "   - Determine emotion from words used, context, punctuation, and actions described\n\n"
                        "3. FORMAT REQUIREMENTS:\n"
                        "   - Format as: <Character><emotion>\"text\" (NO EXTRA TEXT)\n"
                        "   - For chapter titles/formatting: <Narrator><title>\"text\"\n\n"
                        f"CONTEXT FROM STORY (if available):\n{lines[max(0, i-3):min(total_lines, i+2)]}\n\n"
                        f"LINE TO ANALYZE: \"{line}\"\n\n"
                        "PROVIDE ONLY THE TAGGED RESULT IN THE FORMAT <Character><emotion>\"text\". NO EXPLANATIONS."
                    )

                    response = openai.ChatCompletion.create(  
                        model=model_name,
                        messages=[
                            {"role": "system", "content": "You are a story analyzer that strictly follows tagging format rules."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        max_tokens=150
                    )

                    line_result = response.choices[0].message.content.strip()

                    # Validate format
                    if not (line_result.startswith('<') and '>' in line_result and '"' in line_result):
                        raise ValueError(f"Invalid format received: {line_result}")

                    # Split at first quote to check if character and emotion are properly formatted
                    parts = line_result.split('"', 1)
                    tag_part = parts[0]
                    
                    # Check if tag has both character and emotion
                    if tag_part.count('<') != 2 or tag_part.count('>') != 2:
                        raise ValueError(f"Tag format incorrect: {tag_part}")

                    break  # Success

                except Exception as e:
                    if attempt == 2:
                        print(f"! Critical error on line {i}: {str(e)}") 
                        line_result = f"<{character_name}><{emotion}>\"{line}\""
                        print(f"Using fallback tagging: {line_result[:50]}...")
                    else:
                        print(f"Retrying line {i} after error: {str(e)}")
                        time.sleep(2 ** attempt)

            results.append(line_result)
            print(f"✓ Processed line {i}: {line_result[:50]}...")
  
 
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