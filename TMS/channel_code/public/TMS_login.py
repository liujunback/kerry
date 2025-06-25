import json

import requests


def login():
    try:
        url = "http://120.24.31.239:20000/tms-saas-web/user/login?userNo=KEC064&password=123465&companyNo=&domain="
        response =requests.post(url=url)
        # print(response.text)
        if "token" in response.text:
            return json.loads(response.text)["body"]["token"]
        else:
            print(response.text)
    except json.decoder.JSONDecodeError:
        print("系统正在升级")