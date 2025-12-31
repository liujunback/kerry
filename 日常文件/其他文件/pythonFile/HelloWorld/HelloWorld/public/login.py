import json
import requests


def login():
    url = "http://47.119.120.7:8000/pos-web/token/get"#测试
    #url = "http://120.78.66.231:8000/pos-web/token/get" #生产
    payload={
                "username": "999666_KERRYCN",
                "password": "b05b41732aac4fa491723669c35f10d3"
            }
    # {
    #             "username": "900001_KERRYCN",
    #             "password": "9331d40752404da095548a7528fb1e1e"
    #         }
    # payload={
    #             "username": "860038_KERRYCN",
    #             "password": "cf19b760fc774bdf9707e2316ea0f219"
    #         }

    headers = {
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    return json.loads(response.text)['body']['token']
