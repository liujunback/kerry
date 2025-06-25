import json
import random

import datetime
import re

import requests



def  Twms_CN_login(properties):

    url = properties["twms_url"]
    username = properties["twms_username"]
    password = properties["twms_password"]

    IP= url.split("//")[1]
    res1 = requests.get(url + '/admin/login')
    c_token=re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
    payload={
            "username" : username,
            "password" : password,
            "_token" : c_token
        }
    # print(url)
    login= requests.post(url + '/admin/login',data = payload,cookies = res1.cookies)

    if "Logout" in login.text:
        print("登陆成功")
        # print(login.text)
        XSRF_TOKEN = re.findall(r"XSRF-TOKEN=(.+?) for " + IP,str(login.cookies))[0]
        laravel_session = re.findall(r"laravel_session=(.+?) for " + IP,str(login.cookies))[0]
        csrf_token = re.findall(r"csrf-token\" content=\"(.+?)\">",str(login.text))[0]

        return {"cookies":{
                                "XSRF-TOKEN" : XSRF_TOKEN,
                                "laravel_session" : laravel_session
                            },
                "_token" : c_token,
                "csrf_token" : csrf_token
        }

