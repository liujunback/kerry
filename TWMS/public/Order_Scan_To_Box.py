import datetime
import json
import re

import requests


def box_by_order(properties,login,order_number,sku_list,pick_wave_data):
    """打包入箱:M,L"""
    url = properties["TWMS_URL"].rstrip('/')  + "/opt/pack/ajax-pack-by-order"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    type = box_type(properties,login,pick_wave_data)
    for sku_data in sku_list:
        payload={
            "order_number":order_number,
            "qty":sku_data["sku_qty"],
            "barcode": sku_data["sku"],
            "weight":2,
            "box_type":1,
            "type":type,
            "uom":"",
            "client_id":pick_wave_data["client_id"],
            "serial_number":"",
            "barcode_type":"default",
            "per_carton_qty":1,
            "packing_unit":"item"
        }
        response = requests.request("POST", url, headers=headers, data=payload)

        if json.loads(response.text)['status'] == 0:
            print(f"打包入箱扫描成功：{type}订单号：{order_number}")
            return True
        else:
            print("打包入箱扫描失败：" + response.text)


def box_by_order_S(properties,login,sku_list,pick_wave_data):
    """打包入箱,S"""
    url = properties["TWMS_URL"].rstrip('/')  + "/opt/pack/ajax-pack-by-wave"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    payload={
        "wave_number":pick_wave_data["pick_wave_num"],
        "barcode":sku_list[0]["sku"],
        "barcode_type": "default",
        "weight":2,
        "box_type":properties["box_type"],
        "type":"S",
        "serial_number":"",
        "skip_weight":"no",
        "forceSkipWeight":1
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    if json.loads(response.text)['status'] == 0:
        # print(response.text)
        print("打包入箱扫描成功（S类型）：")
        return True
    else:
        print("打包入箱扫描失败：" + response.text)



def box_by_order_S_Multiple(properties,login,sku_list,pick_wave_data):
    """打包入箱,S+"""
    url = properties["TWMS_URL"].rstrip('/')  + "/opt/pack/ajax-new-pack-by-wave"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }

    payload={
        "wave_number":pick_wave_data["pick_wave_num"],
        "barcode":sku_list[0]["sku"],
        "qty": 1,
        "serial_number":""
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    if json.loads(response.text)['status'] == 0:
        print("打包入箱扫描成功（S+类型）：")
    else:
        print("打包入箱扫描失败（S+类型）：" + response.text)



def box_by_order_M_Multiple(properties,login,sku_list,pick_wave_data):
    """打包入箱,M爆款"""
    url = properties["TWMS_URL"].rstrip('/')  + "/opt/pack/ajax-wave-order-confirm"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    payload={
        "number":pick_wave_data["pick_wave_num"],
        "number_type":"wave",
        "forceSkipWeight":1,
        "box_type":properties["box_type"],
        "is_fixed_1_piece_1_package":0,
        "weight":""
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    if json.loads(response.text)['code'] == 201:
        print("打包入箱扫描成功（M爆款）：")
        return json.loads(response.text)['job_id']
    else:
        print("打包入箱扫描失败：" + response.text)





def box_type(properties,login,pick_wave_data):
    url = properties["TWMS_URL"].rstrip('/')  + "/opt/pick_wave/ajax/list"
    params ={
        "draw":1,
                "columns[0][data]":"selection",
                "columns[0][name]":"",
                "columns[0][searchable]":"false",
                "columns[0][orderable]":"false",
                "columns[0][search][value]":"",
                "columns[0][search][regex]":"false",
                "columns[1][data]":"id",
                "columns[1][name]":"",
                "columns[1][searchable]":True,
                "columns[1][orderable]":True,
                "columns[1][search][value]":"",
                "columns[1][search][regex]":"",
                "columns[2][data]":"",
                "columns[2][name]":"",
                "columns[2][searchable]":"",
                "columns[2][orderable]":"",
                "columns[2][search][value]":"",
                "columns[2][search][regex]":"",
                "columns[3][data]":"",
                "columns[3][name]":"",
                "columns[3][searchable]":"",
                "columns[3][orderable]":"",
                "columns[3][search][value]":"",
                "columns[3][search][regex]":"",
                "columns[4][data]":"",
                "columns[4][name]":"",
                "columns[4][searchable]":"",
                "columns[4][orderable]":"",
                "columns[4][search][value]":"",
                "columns[4][search][regex]":"",
                "columns[5][data]":"",
                "columns[5][name]":"",
                "columns[5][searchable]":"",
                "columns[5][orderable]":"",
                "columns[5][search][value]":"",
                "columns[5][search][regex]":"",
                "columns[6][data]":"",
                "columns[6][name]":"",
                "columns[6][searchable]":"",
                "columns[6][orderable]":"",
                "columns[6][search][value]":"",
                "columns[6][search][regex]":"",
                "columns[7][data]":"",
                "columns[7][name]":"",
                "columns[7][searchable]":"",
                "columns[7][orderable]":"",
                "columns[7][search][value]":"",
                "columns[7][search][regex]":"",
                "columns[8][data]":"",
                "columns[8][name]":"",
                "columns[8][searchable]":"",
                "columns[8][orderable]":"",
                "columns[8][search][value]":"",
                "columns[8][search][regex]":"",
                "columns[9][data]":"",
                "columns[9][name]":"",
                "columns[9][searchable]":"",
                "columns[9][orderable]":"",
                "columns[9][search][value]":"",
                "columns[9][search][regex]":"",
                "columns[10][data]":"",
                "columns[10][name]":"",
                "columns[10][searchable]":"",
                "columns[10][orderable]":"",
                "columns[10][search][value]":"",
                "columns[10][search][regex]":"",
                "columns[11][data]":"",
                "columns[11][name]":"",
                "columns[11][searchable]":"",
                "columns[11][orderable]":"",
                "columns[11][search][value]":"",
                "columns[11][search][regex]":"",
                "columns[12][data]":"",
                "columns[12][name]":"",
                "columns[12][searchable]":"",
                "columns[12][orderable]":"",
                "columns[12][search][value]":"",
                "columns[12][search][regex]":"",
                "columns[13][data]":"",
                "columns[13][name]":"",
                "columns[13][searchable]":"",
                "columns[13][orderable]":"",
                "columns[13][search][value]":"",
                "columns[13][search][regex]":"",
                "columns[14][data]":"",
                "columns[14][name]":"",
                "columns[14][searchable]":"",
                "columns[14][orderable]":"",
                "columns[14][search][value]":"",
                "columns[14][search][regex]":"",
                "columns[15][data]":"",
                "columns[15][name]":"",
                "columns[15][searchable]":"",
                "columns[15][orderable]":"",
                "columns[15][search][value]":"",
                "columns[15][search][regex]":"",
                "columns[16][data]":"",
                "columns[16][name]":"",
                "columns[16][searchable]":"",
                "columns[16][orderable]":"",
                "columns[16][search][value]":"",
                "columns[16][search][regex]":"",
                "columns[17][data]":"",
                "columns[17][name]":"",
                "columns[17][searchable]":"",
                "columns[17][orderable]":"",
                "columns[17][search][value]":"",
                "columns[17][search][regex]":"",
                "columns[18][data]":"",
                "columns[18][name]":"",
                "columns[18][searchable]":"",
                "columns[18][orderable]":"",
                "columns[18][search][value]":"",
                "columns[18][search][regex]":"",
                "columns[19][data]":"",
                "columns[19][name]":"",
                "columns[19][searchable]":"",
                "columns[19][orderable]":"",
                "columns[19][search][value]":"",
                "columns[19][search][regex]":"",
                "columns[20][data]":"",
                "columns[20][name]":"",
                "columns[20][searchable]":"",
                "columns[20][orderable]":"",
                "columns[20][search][value]":"",
                "columns[20][search][regex]":"",
                "columns[21][data]":"",
                "columns[21][name]":"",
                "columns[21][searchable]":"",
                "columns[21][orderable]":"",
                "columns[21][search][value]":"",
                "columns[21][search][regex]":"",
                "columns[22][data]":"",
                "columns[22][name]":"",
                "columns[22][searchable]":"",
                "columns[22][orderable]":"",
                "columns[22][search][value]":"",
                "columns[22][search][regex]":"",
                "columns[23][data]":"",
                "columns[23][name]":"",
                "columns[23][searchable]":"",
                "columns[23][orderable]":"",
                "columns[23][search][value]":"",
                "columns[23][search][regex]":"",
                "order[0][column]":"",
                "order[0][dir]":"",
                "start":"",
                "length":10,
                "search[value]":"",
                "search[regex]":False,
                "centre_id":37,
                "number_type":"pick_wave_number",
                "numbers": pick_wave_data["pick_wave_num"],
                "timeline_type":"created_at",
                "timeline_at": "2025-08-28 00:00:00 - " + (datetime.datetime.now()).strftime('%Y-%m-%d %H:%M:%S'),
                "status":"",
                "_":""}
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    response = requests.get(url, headers=headers, params=params, timeout=10)

    if json.loads(response.text)['draw'] > 0:
        type = json.loads(response.text)['data'][0]["type"]
        print("波次类型查询成功：" + type)
        return type

    else:
        print("波次类型查询失败：" + response.text)