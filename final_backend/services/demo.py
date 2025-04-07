import os
import openai

client = openai.OpenAI(
  api_key=os.environ.get("TOGETHER_API_KEY"),
  base_url="https://api.together.xyz/v1",
)

response = client.chat.completions.create(
  model="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  messages=[
    {"role": "system", "content": "You are a travel agent. Be descriptive and helpful."},
    {"role": "user", "content": "Tell me the top 3 things to do in San Francisco"},
  ]
)

print(response.choices[0].message.content)