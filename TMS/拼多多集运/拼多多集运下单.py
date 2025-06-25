import datetime
import json
import random

import requests



def pdd_create_order():
    url = "http://120.24.31.239:20000//tms-saas-web/pdd-conso/pdd.service.conso.order.create"
    order_number = "BACK"+ str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(0,9999999))
    sc_number ="ITTEST"+ str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(0,9999999))
    payload={
        "providerCode": "ABC",
        "consoWarehouseCode": "wh001",
        "logisticsOrderCode": order_number,
        "bizType": "CONSO",
        "consoType": "PP",
        "buyerCode": "BC0001",
        "dereRecogCode": order_number,
        "packageQuantity": 1,
        "mailDetails": [
            {
                "expressCode": "快递公司编码",
                "mailNo": sc_number
            }
        ],
        "items": [
            {
                "itemId": "1234467",
                "itemName": "牛仔外套",
                "categoryName": "衣服",
                "totalActualPayment": 5300,
                "currencyUnit": "CENT",
                "currency": "CNY",
                "itemQuantity": 2,
                "itemPicUrl": "https://img.pddpic.com/xxx.jpeg",
                "itemSkuPropety": "黑色15寸",
                "chargedStatus": True,
                "magneticStatus": True
            }
        ],
        "buyerDetail": {
            "name": "zhangsan",
            "telePhone": "13134563214",
            "country": "中国",
            "province": "省份",
            "city": "城市",
            "district": "区域",
            "detailAddress": "详细地址",
            "postCode": "21000"
        },
        "paymentDetail": {
            "tradeOrderSn": "xx0000002",
            "tradeOrderActualAmount":"1000",
            "tradeOrderValue": 5000,
            "currencyUnit": "CENT",
            "currency": "CNY"
        }
    }

    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    # print(response.text)
    if "true" in response.text:
        print("创建成功：" + sc_number)
        return {"sc_number":sc_number,
                "order_number":order_number}
