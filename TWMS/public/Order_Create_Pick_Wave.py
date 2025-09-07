

#波次分拣
import json
import re

import requests


def create_pick_wave(properties,login,wave_data):
    url = properties["TWMS_URL"].rstrip('/')  + "/opt/pick_wave"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    payload={
        "_token" : login['csrf_token'],
        "centre_id" : wave_data["centre_id"],
        "client_ids" : wave_data["client_id"],
        "form_submit":""
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    # print(response.text)

    if "W0" in response.text or json.loads(response.text)['code'] == 200:
        pick_wave_id = re.findall(r"/opt/pick_wave/(.+?)/add-orders",str(response.text))[0]
        pick_wave_num = re.findall(r"<title>(.+?) | WMS @",str(response.text))[0]
        print("波次号：" + pick_wave_num)
        return {
            "pick_wave_id" : int(pick_wave_id),
            "pick_wave_num" : pick_wave_num,
            "client_id" : int(wave_data["client_id"]),
            "centre_id" : int(wave_data["centre_id"]),
            "order_ids":wave_data["order_ids"]
        }
    else:
        print("创建波次失败")
        print("")




