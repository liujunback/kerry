import json

import requests


def Ops_Login(properties):
    url = properties['ops_url']
    username = properties['ops_username']
    password = properties['ops_password']
    company = properties['company']
    server = properties['ops_server']
    data = {
        "userNo": username,
        "password": password,
        "server": server,
        "company": company
    }
    header = {
        'Content-Type': 'application/json'
    }
    url = url + "/account/tms/login"
    response = requests.post(url, data=json.dumps(data), headers=header, verify=False)
    if response.status_code == 200:
        if json.loads(response.text)["code"] == 200:
            return json.loads(response.text)["data"]["token"]
        else:
            print(response.text)
