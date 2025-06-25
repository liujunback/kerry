import json
import random
from time import sleep
from urllib import parse

import re
import requests

def  Twms_pack_by_order(login_data,wave_data):

    url = "https://stg.hk.timeswms.com/zh/admin/pack/ajax-pack-by-order"
    headers ={
        'X-Csrf-Token': login_data['csrf_token'],
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }
    order_data = Twms_pack_select_order(login_data,wave_data)
    sku_list = order_data["sku_list"]
    order_number = order_data["order_number"]
    print(sku_list)
    for i in range(len(sku_list)):
        payload='order_number=' + order_number + '&qty=' + str(sku_list[i]["qty"]) + '&barcode=' + sku_list[i]["barcode"] + '&weight=&box_type=1&type=L&uom=&client_id=68&serial_number=&barcode_type=default'
        response = requests.request("POST", url, headers=headers, data=payload)
        if json.loads(response.text)["status"] == 0:
            print("波次扫描订单成功:" + sku_list[i]["sku"])
        else:
            print(response.text)

def Twms_pack_select_order(login_data,wave_data):

    url = "https://stg.hk.timeswms.com/zh/admin/pack/ajax-progress-wave"
    headers ={
        'X-Csrf-Token': login_data['csrf_token'],
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }

    payload='wave_number='+ wave_data['wave_pack'] +'&type=L&client_id='

    response = requests.request("POST", url, headers=headers, data=payload)
    if "0" in response.text:
        sku_list = []
        item = json.loads(response.text)["pick_wave"]["orders"][0]["items"]
        # print(item)
        for i in range(len(item)):
            sku_list.append({"sku":json.loads(response.text)["pick_wave"]["orders"][0]["items"][i]["sku"]["code"]
                                ,"barcode":json.loads(response.text)["pick_wave"]["orders"][0]["items"][i]["sku"]["barcode"],
                             "qty":json.loads(response.text)["pick_wave"]["orders"][0]["items"][i]["allocated_qty"]})
        order_number=json.loads(response.text)["pick_wave"]["orders"][0]["order_number"]
        return {"sku_list":sku_list,
                "order_number":order_number}








