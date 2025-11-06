import requests
import json
import time
from datetime import datetime


def create_shipments():
    url = "https://pos-eng.kec.kln.cn//pos-web/shipment/create/multiple"
    token = "ec682758-9d8f-47f5-bfd1-33cd518b91ab"

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    data = {
        "bag_weight": "12223412133",
        "bag_id": "",
        "bag_length": "312",
        "bag_width": 10,
        "bag_height": 2,
        "package_list": []
        }
    for i in range(1,101):
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        reference_num = f"TESTBACK{timestamp}{i}"
        # print(reference_num)
        tracking_num = f"ITTEST{timestamp}{i}"
        data["package_list"].append({
                    "items": [
                        {
                            "category": "Other",
                            "country_of_origin": "SG",
                            "currency": "THB",
                            "description": "Sportswear",
                            "description_origin_language": "",
                            "height": 5,
                            "hs_code": "62064000",
                            "length": 5,
                            "quantity": 1,
                            "unit_price": 1,
                            "unit_weight": 1000,
                            "width": 5
                        }
                    ],
                    "package": {
                        "actual_weight": 1000,
                        "declared_value": 1,
                        "declared_value_currency": "THB",
                        "incidental_fee": 0,
                        "number_of_package": 1,
                        "package_type": "WPX",
                        "payment_method": "PP",
                        "reference_number": reference_num,
                        "tracking_number": tracking_num,
                        "shipment_term": "DDP",
                        "shipment_type": "General",
                        "shipping_fee": 0
                    },
                    "receiver": {
                        "address": "ซอย เอกชัย 30 แยก 12-2เขตจอมทอง",
                        "city": "Prachathipat",
                        "country_code": "TH",
                        "district": "",
                        "email": "Ikrychun@eshopworld.com",
                        "id_number": "",
                        "location_code": "",
                        "name": "Inna Krychun",
                        "phone": "+66 43 122 541",
                        "post_code": "12130",
                        "province": "LPG"
                    },
                    "sender": {
                        "address": "eShopWorld C/O LF Logistics Services Pte Ltd",
                        "city": "Singapore",
                        "country_code": "SG",
                        "email": "operations@eshopworld.com",
                        "ioss_number": "",
                        "name": "U.S. Direct E Commerce (Singapore) Pte Ltd",
                        "phone": "+6564501234",
                        "post_code": "648165",
                        "province": "SG"
                    },
                    "service": {
                        "channel_code": "KEC-TESTGX",
                        "service_type": "default"
                    }
                })

    try:
        time_start = time.time()
        response = requests.post(url, headers=headers, json=data)
        time_end = time.time()
        print('下单耗时：', round(time_end - time_start, 2), 's')
        print(f"第 {i} 个包裹: 状态码 {response.status_code}")
        print(f": {response.text}")
    except Exception as e:
        print(f"请求失败: {e}")

        # 添加延迟避免服务器压力
        # time.sleep(0.5)


if __name__ == "__main__":
    create_shipments()