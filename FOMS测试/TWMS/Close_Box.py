import json
import re

import requests


def close_box(properties,login,order_number,pick_wave_data):
    url = properties["twms_url"] + "/zh/admin/pack/ajax-close-box"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    payload={
        "order_number":order_number,
        "weight":1,
        "box_type":properties["box_type"],
        "client_id":pick_wave_data["client_id"],
        "skip_weight":"no",
        "forceSkipWeight":0
    }
    print(payload)
    response = requests.request("POST", url, headers=headers, data=payload)
    # print(response.text)
    if json.loads(response.text)['status'] == 0:
        tracking_number = json.loads(response.text)['shipments'][0]["tracking_number"]
        print("打包入箱关箱成功：" + tracking_number)
        return tracking_number
    else:
        print("打包入箱关箱失败：" + response.text)