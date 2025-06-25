import json

import requests

url = "https://stg.spider.tec-api.com/package/booking"

payload={
    "shipper":{
        "address1":"9\/F, Kerry Warehouse (Shatin), N.T., Hong Kong",
        "address2":"",
        "province":"NT",
        "city":"Shatin",
        "district":"Shatin",
        "sub_district":"-",
        "country_code":"HK",
        "email":"",
        "location_id":"",
        "name":"Nestle Hong Kong Limited",
        "id_card_number":"0000000",
        "company_name":"Nestle",
        "phone":"000",
        "postcode":"000000"
    },
    "consignee":{
        "address1":"\u6fb3\u9580\u5546\u696d\u5927\u99ac\u8def251A-301\u865f\u53cb\u90a6\u5ee3\u58341308\u5ba4  -",
        "address2":"",
        "province":"\u6fb3\u9580\u534a\u5cf6",
        "city":"\u6fb3\u9580\u534a\u5cf6",
        "district":"-",
        "sub_district":"-",
        "country_code":"MO",
        "email":"ufong912@gmail.com",
        "location_id":"",
        "name":"\u7d50\u5bb9 \u9673",
        "id_card_number":"000000",
        "company_name":"\u60e0\u6c0f\b(\u9999\u6e2f)\u63a7\u80a1\u6709\u9650\u516c\u53f8",
        "phone":"6387 9389",
        "postcode":"999078"
    },
    "package":{
        "actual_weight":"1",
        "estimate_weight":"1",
        "weight_unit":"kg",
        "cod_value":"0",
        "cod_value_currency":"HKD",
        "declared_value":"432.6",
        "declared_value_currency":"HKD",
        "dimension_height":"1",
        "dimension_length":"1",
        "dimension_width":"1",
        "dimension_unit":"cm",
        "item_quantity":7,
        "order_number":"KECHKNES001165541",
        "shipper_reference_id":"NH11K2523514a",
        "payment_method":"prepaid",
        "shipment_term":"DDU",
        "number_of_package":"1",
        "insurance_value":0,
        "insurance_currency":""
    },
    "reference":{
        "track_require":1,
        "delivery_method":"to_door",
        "user_uuid":"5f59c786-1808-4fb9-8dc8-8cda78a8d815",
        "config_uuid":"KerryHK(10*15)",
        "provider_info":{
            "locker_id":"",
            "company_slug":"kerryhk"
        },
        "extra_response_info":"-",
        "sort_code":"HK-TE-01",
        "client_code":"700271",
        "client_name":"back"
    },
    "items":[
        {
            "category_id":"",
            "category_name":"\u96c0\u5de2\u00ae \u9999\u6fc3\u5373\u51b2\u6731\u53e4\u529b\u98f2\u54c1 6\u7247",
            "brand":"",
            "model":"",
            "description":"\u96c0\u5de2\u00ae \u9999\u6fc3\u5373\u51b2\u6731\u53e4\u529b\u98f2\u54c1 6\u7247",
            "name":"\u96c0\u5de2\u00ae \u9999\u6fc3\u5373\u51b2\u6731\u53e4\u529b\u98f2\u54c1 6\u7247",
            "platform_id":"Nestle (Hong Kong) Limited",
            "platform_name":"Nestle (Hong Kong) Limited",
            "quantity":1,
            "sku":"12377724",
            "unit_price":24.9,
            "currency":"HKD",
            "single_weight":"",
            "weight_unit":"kg",
            "description_origin_language":"\u96c0\u5de2\u00ae \u9999\u6fc3\u5373\u51b2\u6731\u53e4\u529b\u98f2\u54c1 6\u7247",
            "dimension_height":"",
            "dimension_length":"",
            "dimension_width":"",
            "dimension_unit":"cm",
            "hts_code":"-",
            "manufacture_country_code":"",
            "manufacture_country_name":""
        }
    ]
}
headers = {
  'Content-Type': 'application/json',
  'authorization': 'Bearer test123token'
}

response = requests.request("POST", url, headers=headers, data=json.dumps(payload))


print(response.text)
