# -*- coding: utf-8 -*-

import requests
import json

url = "https://api.siliconflow.cn/v1/chat/completions"
payload = json.dumps({
    "model": "Qwen/QwQ-32B",
    "messages": [
        {
            "role": "user",
            "content": "使用中文?"
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
}, ensure_ascii=False)  # 纭�淇�ASCII瀛楃涓�琚�浣跨敤锛�鏈夊姪浜�澶勭悊闈�ASCII瀛楃

headers = {
    'Authorization': 'Bearer sk-kaifbxqhhizddruvsivaxzsqzoybriolaoomrcqzzlbdgztx',
    'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload.encode('utf-8'))  # 璐�杞�缂栫爜涓�UTF-8

# 鎵�鍗�鍝嶅簲澶�锛�鐢ㄤ簬璋冭瘯
print("鍝嶅簲澶�:")
print(response.headers)

# 妫�鏌�鍝嶅簲鏄惁鏈�JSON鍐呭绫诲瀷
content_type = response.headers.get('Content-Type', '')
print(f"Content-Type: {content_type}")

# 妫�鏌�Content-Type涓�鏄惁鍖呭惈charset=utf-8
if 'charset=utf-8' in content_type.lower():
    print("鍐呭绫诲瀷鎸囧畾UTF-8缂栫爜锛�浣跨敤榛樿瑙�鐮�銆�")
    try:
        response_json = response.json()
        print("鍝嶅簲JSON:")
        print(json.dumps(response_json, ensure_ascii=False, indent=4))
    except json.JSONDecodeError as e:
        print(f"JSON瑙�鐮�閿欒: {e}")
        print("鍝嶅簲鏂囨湰:")
        print(response.text)
else:
    print("鍐呭绫诲瀷鏈�鎸囧畾鎴�鏈�鎸囧畾UTF-8缂栫爜锛�鏄�寮�璁剧疆涓�UTF-8缂栫爜銆�")
    response.encoding = 'utf-8'
    print("鍝嶅簲鏂囨湰:")
    print(response.text)