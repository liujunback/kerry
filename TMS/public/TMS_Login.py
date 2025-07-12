import json

import requests


def login():
    try:
        #3d9188577cc9bfe9291ac66b5cc872b7
        url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/user/login?userNo=KEC064&password=123465&companyNo=&domain="
        response =requests.post(url=url)
        # print(response.text)
        return json.loads(response.text)["body"]["token"]
    except json.decoder.JSONDecodeError:
        print("系统正在升级")
# login()