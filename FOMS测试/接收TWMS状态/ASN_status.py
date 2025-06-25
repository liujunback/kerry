import json

import requests


def ASN_Status(properties,asn_num,sku_number):

    url = properties["url"] + "api/foms/v2/asn/status/webhook"

    payload={
        "centre_code": "KCC16F",
        "client_code": "FOMSTEST",
        "asn_number": asn_num,
        "invoice_tax_number": None,
        "status": "close",
        "confirmed_at": "2023-11-01T11:58:21+0800",
        "items": [
            {
            "code":sku_number,
            "barcode":sku_number + "-1",
            "estimated_qty":10,
            "available_qty":0,
            "damaged_qty":0,
            "on_hold_qty":0,
            "qty":10,
            "po_number":"1",
            "udf_1":"345",
            "line_item_id":"1",
            "serial_number":"12312341,test000111",
            "receive_at":"2023-11-10T11:37:20+0800"
        }
        ]
    }


    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

    if "Success" in response.text:
        print("更新ASN状态成功")
    else:
        print(response.text)
