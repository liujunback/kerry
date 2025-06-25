import json
import random
from time import sleep
from urllib import parse

import re
import requests

from FOMS.public.Login import Login_Foms
from TWMS.public.TWMS_Login import Twms_login


def  Twms_Handover(login_data,tracking_number):

    url = "https://stg.hk.timeswms.com/zh/admin/scan/handover-by-tracking-number"
    headers ={
        'X-Csrf-Token': login_data['csrf_token'],
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }
    agent = Twms_Handover_GET_agent(login_data,tracking_number)
    payload = 'tracking_numbers=' + tracking_number + '&agent=' + agent + '&is_multiple=1'

    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["code"] == 200:
        handover_number = json.loads(response.text)["handover_number"]
        print("移交成功:" + handover_number)
        return handover_number
    else:
        print(response.text)




def  Twms_Handover_GET_agent(login_data,tracking_number):
    url = "https://stg.hk.timeswms.com/zh/admin/scan/handover/get-agent"
    headers ={
        'X-Csrf-Token': login_data['csrf_token'],
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }

    payload = 'tracking_number=' + tracking_number

    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["code"] == 200:
        agent = json.loads(response.text)["agent"]
        return agent
    else:
        print(response.text)



