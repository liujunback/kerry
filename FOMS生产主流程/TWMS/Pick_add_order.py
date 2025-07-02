import json
import re

import requests


def pick_add_order(properties,login,pick_wave_data):
    url = properties["twms_url"] + "/opt/pick_wave/" + str(pick_wave_data["pick_wave_id"]) + "/add-orders"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    payload={
        "_token" : login['csrf_token'],
        "client_id[]": pick_wave_data["client_id"],
        "order_number":"",
        "ordertype":"",
        "is_partial_allocate_stock": 0,
        "sku_code":"",
        "sku_barcode":"",
        "order_items_greater":"",
        "order_items_less":"",
        "one_order_one_item": 0,
        "logistics_provider_id":"",
        "consignee_country":"",
        "consignee_city":"",
        "order_date":"",
        "created_at":"",
        "etd_at":"",
        "is_contain_temperature_control_items":"",
        "sku_tag":"",
        "number_of_available_tote":"",
        "is_validation_cbm": 0,
        "pick_remark":"",
        "postcode_zone":"",
        "requested_delivery_date":"",
        "channel":"",
        "packing_material_type":"",
        "print_type": "print",
        "ids[]": pick_wave_data["pick_wave_id"],
        "dataTables_length": 10,
        "add_order_ids[]": pick_wave_data["order_id"],
        "action": "assign"
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    # print(response.text)

    if "Logout" in response.text or json.loads(response.text)['code'] == 200:
        print("订单关联波次成功")
    else:
        print("订单关联波次失败：" + response.text)