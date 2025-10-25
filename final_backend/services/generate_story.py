import json
from openai import OpenAI
import os
import re
from dotenv import load_dotenv
load_dotenv()

def generate_story(genre: str, length: str, context: str = "", api_key: str = os.getenv("OPENAI_API_KEY")) -> str:
    # Initialize client with API key
    client = OpenAI(api_key=api_key)
    
    print("🔑 Using OPENAI_API_KEY:", api_key[:8] + "..." if api_key else "Not Found")

    length_mapping = {
        "short": 20,
        "medium": 550,
        "long": 1000
    }
    target_word_count = length_mapping.get(length.lower(), 3500)

    story_prompt = f"""
Please analyze the following story context and extract structured information. Return ONLY valid JSON with no additional commentary.

CONTEXT:
{context}

The JSON output must follow this structure exactly:
{{
  "characters": [ 
      {{
         "name": string, 
         "role": string, 
         "personality": [string, ...] 
      }}, 
      ...
  ],
  "scenes": [ 
      {{
         "description": string, 
         "mood": string 
      }}, 
      ...
  ],
  "tone": "{genre}"
}}

If any field cannot be determined, use an empty list for "characters" or "scenes", and an empty string for "tone". Do not include any extra fields or text.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert story analyst that extracts structured information from unstructured text."
                },
                {
                    "role": "user",
                    "content": story_prompt
                }
            ]
        )
        response_text = response.choices[0].message.content
    except Exception as e:
        print("❌ Error generating JSON structure:", e)
        return ""

    print("📦 Raw OpenAI JSON response:\n", response_text)
 
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if not json_match:
        print("❌ No valid JSON found in OpenAI response.")
        return ""

    try:
        data = json.loads(json_match.group())
    except json.JSONDecodeError as e:
        print("❌ JSON decoding failed:", e)
        return ""

    if context and not data.get("scenes"):
        data["scenes"] = [{"description": context, "mood": "neutral"}]

    # Build the story prompt with characters and scenes
    story_prompt = f"Tone: {genre}\n"
    if data.get("characters"):
        story_prompt += "Characters:\n"
        for char in data['characters']:
            personality = char.get('personality', [])
            personality_str = ', '.join(personality) if isinstance(personality, list) else str(personality)
            story_prompt += f"- {char.get('name', 'Unknown')}: {personality_str}\n"

    if data.get("scenes"):
        story_prompt += "\nScenes:\n"
        for scene in data['scenes']:
            story_prompt += f"- {scene.get('description', '')}\n"

    story_prompt += "\nGenerate a full narrative from the above details."

    # Enhanced prompt generation
    try:
        enhanced_response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": """You are a world-class narrative architect specializing in crafting profoundly immersive stories. Your task is to transform story prompts into masterpieces that:
1. Create visceral, emotional experiences (goosebumps, tears, laughter)
2. Build rich, multidimensional worlds that feel alive
3. Develop complex characters with authentic motivations
4. Weave unexpected yet satisfying plot twists
5. Maintain perfect pacing and tension throughout
6. Incorporate sensory details that transport the reader
7. Balance originality with universal human truths
8. Try to make, the story conversational type, like various characters speaking with each other, with narrator also.

For character development:
- If characters are provided, deepen their complexity
- If missing, create memorable protagonists/antagonists with:
  * Compelling backstories
  * Flawed but relatable personalities
  * Clear character arcs
  * Unique voices and mannerisms

Structure your enhanced prompt to guarantee a story that would stand among the greatest works of literature."""
                },
                {
                    "role": "user",
                    "content": f"""Transform this story foundation into an award-worthy narrative blueprint:

Current Prompt: {story_prompt}

Consider:
1. Emotional Core - What heart-stopping moments will make this unforgettable?
2. World Depth - What rich details will make the setting breathe?
3. Character Alchemy - What transformations will shock and satisfy?
4. Thematic Resonance - What universal truths will it explore?
5. Pacing Architecture - Where will the tension peaks and valleys go?
6. Sensory Symphony - Which vivid descriptions will immerse readers?
7. Unexpected Brilliance - What original elements will make this shine?
8. No need of making any bold letters and no need of making scenes and defining their numbers. Just write the story normally.
9. No need to indentify a paragraph and no need to make a heading of it.
10. Try to make, the story conversational type, like various characters speaking with each other, with narrator also.
Craft a prompt so compelling that the AI has no choice but to generate a masterpiece.
"""
                }
            ]
        )
        enhanced_prompt = enhanced_response.choices[0].message.content
    except Exception as e:
        print("❌ Error generating enhanced prompt:", e)
        return ""

    full_story = ""
    current_word_count = 0
    chunk_count = 0

    try:
        while current_word_count < target_word_count:
            chunk_count += 1
            remaining_words = target_word_count - current_word_count
            chunk_size = min(1000, remaining_words)

            if chunk_count > 1:
                continuation_prompt = f"""
                Continue writing the story from where you left off. 
                The story so far has {current_word_count} words.
                Add approximately {chunk_size} more words to reach our target of {target_word_count} words.
                Here's the story so far:
                {full_story[-2000:]}
                """
            else:
                continuation_prompt = enhanced_prompt

            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a creative writer that writes one of the best stories in the world. Current target: {target_word_count} words total."
                    },
                    {
                        "role": "user",
                        "content": continuation_prompt
                    }
                ]
            )
            chunk = response.choices[0].message.content
            full_story += "\n\n" + chunk
            current_word_count = len(full_story.split())

            print(f"✅ Generated chunk {chunk_count} (~{len(chunk.split())} words), total: ~{current_word_count} words")

        return full_story

    except Exception as e:
        print(f"❌ Error generating text: {e}")
        return full_story if full_story else ""