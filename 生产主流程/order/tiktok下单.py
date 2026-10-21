import datetime
import random

import requests
import json


def create_tiktok_order(properties):
    """
    创建跨境包裹订单

    Args:
        param_data (dict): 订单参数字典
        token (str): 认证token
        cookie (str, optional): Cookie字符串

    Returns:
        dict/str: 响应结果（JSON或文本）
    """
    base_url = properties['tms_url']
    url = base_url +"/tms-saas-web/logistics/provider/cross_border/package_order_create"

    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    reference_number = f"ITTEST{timestamp}{random.randint(1, 300)}"
    param_data = {
        "providerOrderId": reference_number,
        "shippingInfo": {
            "lastName": "",
            "address": {
                "address_l0": "ES",
                "details": "Avinguda Meridiana 7 Piso 3 Puerto 1",
                "address_l3": "Barcelona",
                "address_l4": "",
                "address_l1": "Catalonia",
                "address_l2": "Barcelona"
            },
            "mobile": "(+34)695507118",
            "email": "Barcelona@qq.com",
            "postcode": "08018",
            "firstName": "Oriana OrianaOriana OrianaOrianaOriana OrianaOriana 12312312312356OrianaOriana OrianaOriana OrianaOriana  qwewer gergrwegf wergwrc",
            "phone": "(+34)695507118"
        },
        "timeZone": "UTC+0",
        "returnInfo": {
            "lastName": "",
            "address": {
                "addressL0": "ES",
                "addressL1": "Castilla La Mancha",
                "addressL2": "Toledo",
                "details": "Logistica 9 NAVE10 A-4,KM.64.500, 45300 Ocaña, Toledo",
                "addressL3": "Ocana",
                "addressL4": ""
            },
            "postcode": "45300",
            "mobile": "0034 813653618",
            "firstName": "ZHAO HUI",
            "phone": "0034 813653618"
        },
        "shippingMethodCode": "DXTTESXLR",
        "senderInfo": {
            "lastName": "TT",
            "email": "Barcelona@qq.com",
            "address": {
                "address_l0": "China",
                "details": "京东产业园区东区9号库一楼",
                "address_l3": "Huadu",
                "address_l4": "花东镇",
                "address_l1": "Guangdong",
                "address_l2": "Guangzhou"
            },
            "mobile": "18601776153",
            "postcode": "0",
            "firstName": "阴少朋",
            "phone": "18601776153"
        },
        "trackingNo": "-",
        "bigBagNo": "-",
        "value": {
            "goodsValue": "0",
            "codValue": "0",
            "isCod": 0,
            "currency": "EUR",
            "totalGoodsValue": "2.89"
        },
        "package_info": {
            "length": 23,
            "weight": 200,
            "volume": 1610,
            "width": 10,
            "height": 7
        },
        "items": [
            {
                "unitPrice": "0",
                "unitWeight": 364,
                "productName": "Limpiador facial iluminador de cúrcuma, limpiador facial de limpieza suave, producto hidratante para el cuidado de la piel facial para mujeres y hombres",
                "qty": 1,
                "category": "601609",
                "productUrl": "",
                "skuId": "172238854798"
            }
        ],
        "returnType": 1
    }
    payload = {
        'param_json': json.dumps(param_data, ensure_ascii=False)
    }

    files = []

    headers = {
        'token': "eyJ0-W1l#3RhbXAiOjE2NDg4Nzk0$zEw$DEsIm5vbmNlIjoiZHZTTUVV#TAiLCJ0b2tlbiI6Ijg0YzQzYjlkLWI3$jQtNGZk$C1hOTViLWU3NTFiNj#4ODA1YyJ9",
    }

    response = requests.post(url, headers=headers, data=payload, files=files)
    if "success" in response.text:
        print(response.text)
        tracking_number =  response.json()["data"]["waybill"]["tracking_no"]
    return tracking_number

