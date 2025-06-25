import json
import random

import datetime
import requests

url = "https://tms-kp.kerry-ecommerce.com.cn/tms-saas-web/wish/order/create"
number = "backtest" +str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,300))
payload={
    "apiKey": "r7ozJZmjvQHONMQZ9FIdCgjOxL02lWkaC55AGEQdJnPdlAqYhXbWRhPM6VUA",
    "operationCenterCode": "KEC_HANGZHOU_CHN_01",
    "wishpostBusinessType": "APLUS_COMBINED",
    "requireLabel": True,
    "returnInfo": {
        "returnAddressInCountry": {
            "addressLocal": {
                "country": "中国",
                "city": "杭州市",
                "streetAddress1": "浙江省杭州市萧山区靖江街道保税物流中心9号仓库2楼Fashion",
                "streetAddress2": "",
                "province": "浙江省",
                "district": "杭州市",
                "name": "李永侠"
            },
            "zipcode": "311200",
            "phone": "18858141032",
            "countryCode": "HKG",
            "company": "",
            "email": ""
        },
        "returnActionInCountry": 2,
        "returnActionOutCountry": 0
    },
    "orderTime": "2023-05-05T11:06:37.686Z",
    "carryType": 1,
    "wishpostServiceType": "4PL",
    "trackingId": number,
    "timestamp": "2023-05-05T11:06:38.239Z",
    "parcel": {
        "categoryEn": "",
        "descriptionEn": "Eye mask",
        "priceUnit": "euro",
        "descriptionLocal": "眼罩",
        "declareValue": 9,
        "dimensionUnit": "cm",
        "weight": 0.076,
        "userDesc": "",
        "priceCurrency": "USD",
        "hasBattery": True,
        "transportValue": 1.5,
        "intrinsicValue": 6.92,
        "productList": [
            {
                "categoryEn": "",
                "descriptionEn": "Screwdriver;Tools;Adapters;Doormat;Adapter;Wallet;Roll-velcro-rd;Cycling equipment;Cycling equipment;Ribbon;Tie",
                "descriptionLocal": "眼罩",
                "quantity": 1,
                "weight": 0.076,
                "originCountryCode": "CHN",
                "piece": 1,
                "hasBattery": True,
                "imageUrl": "https://canary.contestimg.wish.com/api/webimage/636e0857950105f0bdb2f935-large.jpg",
                "originCountry": "China",
                "productUrl": "https://www.wish.com/c/636e0857950105f0bdb2f935",
                "value": 6.92
            }
        ],
        "weightUnit": "kg"
    },
    "receiver":  {
        "addressLocal": {
            "country": "Brazil",
            "city": "Alvorada ",
            "streetAddress1": "Rua Gaspar Martins, 672-Casa",
            "streetAddress2": "",
            "province": "Rio Grande do Sul",
            "district": "",
            "name": "Diego Pensado Pazos Carneiro"
        },
        "zipcode": "06414025",
        "phone": "11981056881",
        "countryCode": "BRA",
        "tax_id":"11675524742",
        "company": "",
        "addressEn": {
            "country": "Brazil",
            "city": "Barueri",
            "streetAddress1": "Werner Goldberg, 77-161 - torrerouxinol",
            "streetAddress2": "",
            "province": "Sao Paulo",
            "district": "",
            "name": "Diego Pensado Pazos Carneiro"
        },
        "email": "aeren29@yahoo.es"
    },
    "stype": 3,
    "pickup": {
        "addressLocal": {
            "country": "香港",
            "city": "杭州市",
            "streetAddress1": "浙江省杭州市萧山区靖江街道保税物流中心9号仓库2楼Fashion",
            "streetAddress2": "",
            "province": "浙江省",
            "district": "",
            "name": "李永侠"
        },
        "zipcode": "",
        "phone": "18858141032",
        "countryCode": "HKG",
        "company": "",
        "addressEn": {
            "country": "HongKong",
            "city": "hangzhou",
            "streetAddress1": "Fashion, 2nd Floor, No. 9 Warehouse, Bonded Logistics Center, Jingjiang Street",
            "streetAddress2": "",
            "province": "zhejiang",
            "district": "",
            "name": "LiYONGXIA"
        },
        "email": ""
    },
    "pickupType": 0,
    "isTest": False,
    "sender": {
        "email":"aeren29@yahoo.es",
        "addressLocal": {
            "country": "香港",
            "city": "Hangzhou",
            "streetAddress1": "Jingjiang jiedao baoshuiwuliuzhongxin8hao2louWISHyuncang",
            "streetAddress2": "",
            "province": "ZJ",
            "district": "",
            "name": "Xieming"
        },
        "zipcode": "311200",
        "phone": "18094709032",
        "countryCode": "HKG",
        "iossVatId": "IM5280002079",
        "company": "",
        "addressEn": {
            "country": "China",
            "city": "Hangzhou",
            "streetAddress1": "Jingjiang jiedao baoshuiwuliuzhongxin8hao2louWISHyuncang",
            "streetAddress2": "",
            "province": "ZJ",
            "district": "",
            "name": "Xieming"
        }
    },
    "sname": "KEC_KPARCEL_KEXP",
    "carrierCode": 85,
    "customsClearanceMode": 1,
    "isTaxed": True,
    "wishpostSname": "EPC_FPL_ECO_HANGZHOU_01_COMBINED",
    "otype": "2604-1",
    "paidWithWish": True,
    "paymentAccount": {
        "contactName": "wishpost_epc_combine_order",
        "phoneNumber": "+8612345678909",
        "id": "59dd8a524e609210e35285bf",
        "email": "rntest01@rn.com",
        "username": "wishpost_epc_combine_order"
    }
}




headers = {
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

print(response.text)
