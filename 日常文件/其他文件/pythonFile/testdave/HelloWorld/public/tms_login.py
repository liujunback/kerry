import json

import requests


def login():
    url = "http://120.24.31.239:20000/tms-saas-web/user/login?userNo=zmuser&password=123456&companyNo=&domain="
    response =requests.post(url=url)
    #print(response.text)
    return json.loads(response.text)["body"]["token"]
