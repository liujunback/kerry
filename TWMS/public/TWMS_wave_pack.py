import json
import random
from time import sleep
from urllib import parse

import re
import requests

from TWMS.public.TWMS_Login import Twms_login


def  Twms_Create_wave(login_data):
    url = "https://stg.hk.timeswms.com/zh/admin/pick_wave"
    payload='_token=' + login_data['csrf_token'] + '&centre_id=1&client_ids%5B%5D=68&form_submit='
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    wave_pack = re.findall(r"<title>(.+?) | WMS @ staging",str(response.text))[0]
    wave_url = re.findall(r"href=\"(.+?)\" title=\"English",str(response.text))[0]
    wave_id = wave_pack[5:10]
    if wave_pack != None :
        print("创建波次成功：" + wave_pack)
        return {
            "wave_pack":wave_pack,
            "wave_url":wave_url,
            "wave_id":wave_id
        }










