import json
import random
from time import sleep
from urllib import parse

import re
import requests

def  Twms_progress_wave(login_data,wave_data):

    url = "https://stg.hk.timeswms.com/zh/admin/pack/ajax-progress-wave"
    payload='wave_number=' + wave_data['wave_pack'] + '&type=S&client_id='
    headers ={
        'X-Csrf-Token': login_data['csrf_token'],
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    if "0" in response.text:
        print("波次更新大包成功")
    else:
        print(response.text)










