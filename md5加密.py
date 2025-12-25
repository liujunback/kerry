# Please install OpenAI SDK first: `pip3 install openai`
import os
from openai import OpenAI


import requests
import json

url = "https://api.siliconflow.cn/v1/chat/completions"
payload = json.dumps({
    "model": "Qwen/QwQ-32B",
    "messages": [
        {
            "role": "user",
            "content": "What opportunities and challenges will the Chinese large model industry face in 2025?"
        }
    ],
    "stream": False,
    "max_tokens": 4096,
    "thinking_budget": 4096,
    "min_p": 0.05,
    "stop": None,
    "temperature": 0.7,
    "top_p": 0.7,
    "top_k": 50,
    "frequency_penalty": 0.5,
    "n": 1,
    "response_format": {
        "type": "text"
    },
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "<string>",
                "description": "<string>",
                "parameters": {},
                "strict": False
            }
        }
    ]
}, ensure_ascii=False)  # Ensure ASCII characters are not used, which helps with non-ASCII characters

headers = {
    'Authorization': 'Bearer sk-kaifbxqhhizddruvsivaxzsqzoybriolaoomrcqzzlbdgztx',
    'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload.encode('utf-8'))  # Encode payload to UTF-8
print(response.text)

client = OpenAI(
    api_key=os.environ.get('DEEPSEEK_API_KEY'),
    base_url="https://api.deepseek.com")

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Hello"},
    ],
    stream=False
)

print(response.choices[0].message.content)