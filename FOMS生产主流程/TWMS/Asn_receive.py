import json

import requests




def asn_receive(properties,login,asn_data,sku_number):

    url = properties["twms_url"] + "/opt/asn/receive/ajax/submit"
    asn_data = {
                    "asn_number": asn_data['asn_number'],
                    "po_number": "12",
                    "carton": "",
                    "location": properties["location"],
                    "expire_at": "",
                    "manufacture_at": "",
                    "batch": "",
                    "udf_1": "345",
                    "udf_2": "",
                    "udf_3": "",
                    "qty": asn_data['asn_item_qty'],
                    "barcode": sku_number + "-1",
                    "barcode_type": "default",
                    "serial_number": "",
                    "condition": "GOOD",
                    "pre_carton_qty": "1",
                    "receiving_unit": "ea",
                    "boxid": ""
                }

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }

    response = requests.request("POST", url, headers=headers, data=asn_data)
    if json.loads(response.text)["status"] == 0:
        print("批量收货成功")
    else:
        print("批量收货失败：" + response.text)