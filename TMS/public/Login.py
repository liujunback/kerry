import json

import requests


def login():
    # url = "http://47.119.120.7:22900/pos-web/token/get"#测试
    url = "https://pos-kec-eng-uat.kec-app.com/pos-web/token/get" #生产
    payload={
                "username": "999666_KERRYCN",
                "password": "b05b41732aac4fa491723669c35f10d3"
            }
    # payload = {
    #             "username": "860915_KERRYCN",
    #             "password": "060f552420d342edad4dd241264c5076"
    #         }
    # payload={
    #             "username": "999888_KERRYCN",
    #             "password": "5238ae346b8a4c4782d40562a83d0905"
    #         }
    # payload = {
    #             "username": "860777_KERRYCN",
    #             "password": "07bf3b995e6a4a8f84d176017a1bbe22"
    #         }
    # payload = {
    #             "username": "700094_KERRYCN",
    #             "password": "af65d9f869fd461a9b3f09253fe7ee1c"
    #         }
    # payload = {
    #             "username": "9900016_KERRYCN",
    #             "password": "c95048ef54cd4a50a7d6df34c25a4161"
    #         }
    # payload={
    #             "username": "861116_KERRYCN",
    #             "password": "8f53fb3c57264fe5a834ffb220eff535"
    #         }
    # payload={
    #             "username": "860915_KERRYCN",
    #             "password": "060f552420d342edad4dd241264c5076"
    #         }
    # payload={
    #             "username": "860708_KERRYCN",
    #             "password": "b3a5d95d923f4aad84ee2c60cb929f06"
    #         }

    headers = {
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    return json.loads(response.text)['body']['token']