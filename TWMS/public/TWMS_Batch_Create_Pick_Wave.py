

#波次分拣
import json
import re

import requests

from TWMS.public.TWMS_Select_Order_id import select_order_id


def batch_create_pick_wave(properties,login,wave_data,wave_type=""):
    url = properties["TWMS_URL"].rstrip('/') + "/opt/pick_wave/batch-create"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    payload={
        "_token" : login['csrf_token'],
        "action":"batch_create_multiple",
        "add_order_ids[]" : wave_data["order_ids"],
        "wave_type" : wave_type,
        "per_wave_qty":len(wave_data["order_ids"]),
        "packing_material_type":"",
        "brand":""
    }
    response = requests.request("POST", url, headers=headers, data=payload)


    if  json.loads(response.text)['code'] == 200:
        order_data = select_order_id(properties, login, wave_data["order_number"])
        print("波次创建（批量）成功，订单波次号： " + order_data["pick_wave"]["pick_wave_number"])
        return {
            "pick_wave_id": json.loads(response.text)['data']["pickWaveIds"][0],
            "pick_wave_num": order_data["pick_wave"]["pick_wave_number"],
            "client_id": int(wave_data["client_id"]),
            "centre_id": int(wave_data["centre_id"]),
            "order_ids": wave_data["order_ids"]
        }

    else:
        print(response.text)
        url = properties["TWMS_URL"].rstrip('/') + "/opt/pick_wave/batch-create"
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-TOKEN': login['csrf_token'],
            'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session=' + login['cookies'][
                'laravel_session']
        }
        payload = {
            "_token": login['csrf_token'],
            "action": "batch_create_multiple",
            "add_order_ids[]": wave_data["order_ids"],
            "wave_type": wave_type,
            "per_wave_qty": len(wave_data["order_ids"]),
            "packing_material_type": "",
            "brand": ""
        }
        response = requests.request("POST", url, headers=headers, data=payload)

        if json.loads(response.text)['code'] == 200:
            order_data = select_order_id(properties, login, wave_data["order_number"])
            print("波次创建（批量）成功，订单波次号： " + order_data["pick_wave"]["pick_wave_number"])
            return {
                "pick_wave_id": json.loads(response.text)['data']["pickWaveIds"][0],
                "pick_wave_num": order_data["pick_wave"]["pick_wave_number"],
                "client_id": int(wave_data["client_id"]),
                "centre_id": int(wave_data["centre_id"]),
                "order_ids": wave_data["order_ids"]
            }
        else:
            print("波次创建（批量）失败：")
            print(response.text)







