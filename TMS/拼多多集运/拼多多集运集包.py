import datetime
import json
import random

import requests



def pdd_create_order2(number):
    import requests

    url = "http://120.24.31.239:20000//tms-saas-web/pdd-conso/pdd.service.conso.outbound.notice"

    tracking_number = "TR_Order"+ str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(0,9999999))
    payload={
            "providerCode": "ABC",
            "consoWarehouseCode": "wh001",
            "orderCode": tracking_number,
            "consoType": "PP",
            "buyerCode": "BC0001",
            "logisticsOrderCodes":number['order_numbers'],
            "segmentCode": "SENDTORECEVER",
            "delieryType": "selfSite",
            "sattionCode": "S001",
            "mailDetails": [
                {
                    "expressCode": "快递公司编码",
                    "mailNo": number['sc_number']
                }
            ],
            "receiverDetail": {
                "name": "zhangsan",
                "telePhone": "13134563214",
                "country": "越南",
                "province": "香港特别行政区",
                "city": "九龙",
                "district": "黄大仙区",
                "detailAddress": "详细地址",
                "postCode": "xxx"
            },
            "freightFeeDetail": {
                "payOrderId": "20220511-11001",
                "payTime": "2022-05-11 14:01:03",
                "freightPrice": 2100,
                "currencyUnit": "CENT",
                "currency": "CNY",
                "feeDetails": [
                    {
                        "scene": "freight_fee",
                        "type": "freight_fee",
                        "amount": 1460,
                        "currency": "CNY",
                        "currencyUnit": "CENT"
                    },
                    {
                        "scene": "ren_fee",
                        "type": "rent_fee",
                        "amount": 100,
                        "currency": "CNY",
                        "currencyUnit": "CENT"
                    },
                    {
                        "scene": "gst",
                        "type": "gst",
                        "amount": 16,
                        "currency": "CNY",
                        "currencyUnit": "CENT"
                    }
                ]
            }
        }

    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    # print(response.text)
    if "true" in response.text:
        print("创建成功：" + tracking_number)
        return tracking_number
    else:
        print(response.text)