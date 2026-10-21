import json
import requests


def login():
    url = "http://47.119.120.7:8000/pos-web/token/get"#测试
    #url = "http://120.78.66.231:8000/pos-web/token/get" #生产
    # payload={
    #             "username": "860416_KERRYCN",
    #             "password": "433198736ea248388f4779e57ba7df20"
    #         }
    payload={
                "username": "999666_KERRYCN",
                "password": "b05b41732aac4fa491723669c35f10d3"
            }
    headers = {
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    return json.loads(response.text)['body']['token']
