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
    #             "username": "861200_KERRYCN",
    #             "password": "78daa586252e452dafdd38af5ee31140"
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
    #             "username": "861400_KERRYCN",
    #             "password": "b444dc220b24428d8dd656bfcb50d201"
    #         }
    # payload={
    #             "username": "09151011_KERRYCN",
    #             "password": "62a1e28af1e244c588d65465efa52109"
    #         }
    # payload = {
    #                 "username": "861241_KERRYCN",
    #                 "password": "e6dc9be2c69c4f9bac122e8bb8824b4c"
    #             }
    # payload = {
    #                 "username": "850013_KERRYCN",
    #                 "password": "974382aa35f0469db693d5b40319c439"
    #             }
    # payload = {
    #                 "username": "20260921_KERRYCN",
    #                 "password": "a989261082f145329b9a204846362fc8"
    #             }
    payload = {
                    "username": "20260922_KERRYCN",
                    "password": "08b68165bd164693a3719790fa74fdc4"
                }
    headers = {
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload), verify=False, proxies={"http": None, "https": None})
    return json.loads(response.text)['body']['token']