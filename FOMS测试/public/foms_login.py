import json

import requests

from FOMS生产主流程.properties.GetProperties import getProperties


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

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if "200" in response.text:
        return json.loads(response.text)['data']['token']
    else:
        print(response.text)
