import json
import random
import re

import datetime
import requests




def  Twms_login(properties):
    url = properties['TWMS_URL'] + "/admin/login"
    res1 = requests.get(url)
    c_token=re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
    payload={
            "username":"back.liu",
            "password":"0240815.backA",
            "_token":c_token
        }
    login= requests.post(url,data = payload,cookies = res1.cookies)
    XSRF_TOKEN = re.findall(r"XSRF-TOKEN=(.+?) for",str(login.cookies))[0]
    laravel_session = re.findall(r"laravel_session=(.+?) for",str(login.cookies))[0]
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+XSRF_TOKEN+'; laravel_session=' + laravel_session
    }
    response = requests.request("GET", properties['TWMS_URL'] + "/admin/dashboard",headers=headers)
    # print(response.text)
    csrf_token = re.findall(r"csrf-token\" content=\"(.+?)\">",str(response.text))[0]
    if "Logout" in login.text:
        print("登陆成功")
        return {"cookies":{
                                "XSRF-TOKEN":re.findall(r"XSRF-TOKEN=(.+?) for stg.hk",str(login.cookies))[0],
                                "laravel_session":re.findall(r"laravel_session=(.+?) for stg.hk",str(login.cookies))[0]
                            },
                "_token":c_token,
                "csrf_token":csrf_token
        }
    else:
        print("登录失败")