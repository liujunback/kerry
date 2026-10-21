import json
import random
import datetime
import requests
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry



def create_clearance_order(token,tracking_number):
    import requests
    import json

    url = "https://pos-kec-eng-uat.kec-app.com/pos-web/shipment/create/sum_declaration"

    payload = json.dumps({
        "items": [
            {
                "country_of_origin": "CN",
                "currency": "USD",
                "description": "SOCKS",
                "description_origin_language": "袜子",
                "excc_currency": "USD",
                "excc_hs_code": "6115950019",
                "excc_legal_qty1": 1,
                "excc_legal_qty2": 0.1,
                "excc_unit_price": 1.11,
                "hs_code": "6115950019",
                "measure_unit": "025",
                "origin_of_cnex_code": "33039",
                "quantity": 1,
                "sku": "20992517221000391120",
                "spec": "1|0|针织|短袜|81.2%棉16.3%锦纶2.5%氨纶|巴拉巴拉|无货号|||",
                "unit_price": 1.11,
                "unit_weight": 100
            },
            {
                "country_of_origin": "CN",
                "currency": "USD",
                "description": "SOCKS",
                "description_origin_language": "袜子",
                "excc_currency": "USD",
                "excc_hs_code": "6115950019",
                "excc_legal_qty1": 1,
                "excc_legal_qty2": 0.075,
                "excc_unit_price": 1.11,
                "hs_code": "6115950019",
                "measure_unit": "025",
                "origin_of_cnex_code": "33039",
                "quantity": 1,
                "sku": "20922517220400384120",
                "spec": "1|0|针织|短袜|70.4%棉25.6%锦纶4.0%氨纶|巴拉巴拉|无货号|||",
                "unit_price": 1.11,
                "unit_weight": 75
            },
            {
                "country_of_origin": "CN",
                "currency": "USD",
                "description": "GIRL'S COAT",
                "description_origin_language": "女童上衣",
                "excc_currency": "USD",
                "excc_hs_code": "6204330000",
                "excc_legal_qty1": 1,
                "excc_legal_qty2": 0.085,
                "excc_unit_price": 4.52,
                "hs_code": "6204330000",
                "measure_unit": "011",
                "origin_of_cnex_code": "33039",
                "quantity": 1,
                "sku": "20822510520320047120",
                "spec": "1|0|梭织|上衣|女式|100%锦纶|全开襟|有拉链|巴拉巴拉|无货号|||",
                "unit_price": 4.52,
                "unit_weight": 85
            },
            {
                "country_of_origin": "CN",
                "currency": "USD",
                "description": "SOCKS",
                "description_origin_language": "袜子",
                "excc_currency": "USD",
                "excc_hs_code": "6115950019",
                "excc_legal_qty1": 1,
                "excc_legal_qty2": 0.147,
                "excc_unit_price": 2.4,
                "hs_code": "6115950019",
                "measure_unit": "025",
                "origin_of_cnex_code": "33039",
                "quantity": 1,
                "sku": "20992617200100371140",
                "spec": "1|0|针织|短袜|67.5%棉29.7%锦纶2.8%氨纶|巴拉巴拉|无货号",
                "unit_price": 2.4,
                "unit_weight": 147
            }
        ],
        "package": {
            "actual_weight": 1000,
            "declared_value": 9.14,
            "declared_value_currency": "USD",
            "excc_declared_value": 9.14,
            "excc_declared_value_currency": "USD",
            "incidental_fee": 0,
            "lm_label_url": "https://spider.kec-app.com/package/75d9a7b5-8d83-63a3-af65-96c5fa016677/label",
            "number_of_package": 1,
            "package_type": "WPX",
            "payment_method": "PP",
            "reference_number": tracking_number,
            "shipping_fee": 0,
            "tracking_number": tracking_number
        },
        "receiver": {
            "address": "KowloonHunghomKLvMaDFz0KCj0+pAJ9ed1ZZ4c6NyW183SF1HF6XsL90rSodv+YyA9sr5MA6VtJTizC",
            "city": "Hunghom",
            "company": "Amy Leung",
            "country_code": "TH",
            "name": "Amy Leung",
            "phone": "ME05RF4hCpQ1MW85voPdgA==",
            "post_code": "--"
        },
        "sale_platform": "Shopify",
        "sender": {
            "address": "zhejiang jiaxing pinghu 5 warehouse No. 132 z hapu Port Area",
            "city": "Jiaxing",
            "company": "Balabala Clothing",
            "country_code": "CN",
            "name": "shibinghua",
            "phone": "18248422578",
            "post_code": "314201"
        },
        "service": {
            "channel_code": "CNTH003",
            "service_type": "9610"
        }
    })
    headers = {
        'version': '1.2',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+token
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    if response.status_code == 201:
        print("清关数据更新成功")
    else:
        print(response.text)
