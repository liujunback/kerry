import json

import requests


def Pos_Login(properties):
    url = properties['url']
    username = properties['username']
    password = properties['password']
    url = url + "pos-web/token/get"
    payload = {
        "username": username,
        "password": password
    }
    headers = {
        'Content-Type': 'application/json'
    }
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload), verify=False, timeout=20)
        # print(url)
        if json.loads(response.text)['code'] == 200:
            return json.loads(response.text)['body']['token']
        else:
            print(response.text)
    except requests.exceptions.RequestException as e:
        # print("HTTPS连接超时")
        print(e)
