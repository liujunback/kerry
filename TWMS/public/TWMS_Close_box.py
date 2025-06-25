import json
import random
from time import sleep
from urllib import parse

import re
import requests

def  Twms_Close_box(login_data,FOMS_order):

    url = "https://stg.hk.timeswms.com/zh/admin/pack/ajax-close-box"
    headers ={
        'X-Csrf-Token': login_data['csrf_token'],
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }

    payload = 'order_number=' + FOMS_order + '&weight=12&box_type=1&client_id=68&skip_weight=no'

    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["status"] == 0:
        tracking_number = json.loads(response.text)["shipments"][0]["tracking_number"]
        print("波次关包成功:" + tracking_number)
        return tracking_number
    else:
        print(response.text)










