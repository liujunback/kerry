import json

import requests



def foms_login(properties):
    url = properties['url']+"user/login"
    username = properties['username']
    password = properties['password']
    payload={
        "username": username,
        "password": password
    }
    headers = {
      'Content-Type': 'application/json'
    }
    # print(json.dumps(payload))
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload),proxies={"http": None, "https": None})
    # print(response.text)
    if "200" in response.text:
        return json.loads(response.text)['data']['token']
    else:
        print(response.text)

