import json
import random
import requests
import time
from TMS.public.Controller_Login import Controller_Login


class CaiNiao:

    token = Controller_Login()
    def create(self):
        scPickupTn = "YD01" + str(random.randint(1, 9999999999))
        reference_number = "AT1" + str(random.randint(1, 9999999999))

        url = "https://tms-kec-eng-uat.kec-app.com//tms-saas-web/conso/cargo-precreate"

        payload = json.dumps({
            "scPickupTn": scPickupTn,
            "package": {
                "valueCurrency": "CNY",
                "actualWeight": 1,
                "value": 1
            },
            "sender": {
                "address": "鄂州经济开发区黄泥墩富春网营物联鄂东南供应链运营中心",
                "city": "XM",
                "phone": "17719682245",
                "countryCode": "CN",
                "name": "ANTACK_SF_WHSC",
                "company": "ANTA",
                "postCode": "361000"
            },
            "carrierCode": "OTHER",
            "cargoNo": reference_number,
            "items": [
                {
                    "unitPrice": 0.01,
                    "quantity": 1,
                    "description": "篮球鞋",
                    "descriptionOriginLanguage": "篮球鞋",
                    "sku": "11921104S-37CN"
                }, {
                    "unitPrice": 0.01,
                    "quantity": 1,
                    "description": "篮球鞋6",
                    "descriptionOriginLanguage": "篮球鞋",
                    "sku": "11921104S-37CN"
                }, {
                    "unitPrice": 0.01,
                    "quantity": 1,
                    "description": "篮球鞋5",
                    "descriptionOriginLanguage": "篮球鞋",
                    "sku": "11921104S-37CN"
                }, {
                    "unitPrice": 0.01,
                    "quantity": 1,
                    "description": "篮球鞋4",
                    "descriptionOriginLanguage": "篮球鞋",
                    "sku": "11921104S-37CN"
                }, {
                    "unitPrice": 0.01,
                    "quantity": 1,
                    "description": "篮球鞋3",
                    "descriptionOriginLanguage": "篮球鞋",
                    "sku": "11921104S-37CN"
                }, {
                    "unitPrice": 0.01,
                    "quantity": 1,
                    "description": "篮球鞋2",
                    "descriptionOriginLanguage": "篮球鞋",
                    "sku": "11921104S-37CN"
                }, {
                    "unitPrice": 0.01,
                    "quantity": 1,
                    "description": "篮球鞋1",
                    "descriptionOriginLanguage": "篮球鞋",
                    "sku": "11921104S-37CN"
                }
            ]
        })
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer xBfMWfrrD1x4dAtzdby87KHSMKMJMZ5rrMStbkJKF45QAXK55h4TEZY85SiAJcar'
        }

        response = requests.request("POST", url, headers=headers, data=payload)

        # print(response.text)
        print(scPickupTn)
        return {"trcking_number": scPickupTn, "reference_number": reference_number}

    def jiyun(self, tracing_numbers):
        """集运方法，支持多个跟踪号

        Args:
            tracing_numbers: 单个跟踪号字符串或多个跟踪号的列表
        """
        # 统一转换为列表格式
        if isinstance(tracing_numbers, str):
            tracing_numbers = [tracing_numbers]

        reference_number = "AT2" + str(random.randint(1, 9999999999))

        url = "https://tms-kec-eng-uat.kec-app.com//tms-saas-web/conso/cargo-consolidation"

        payload = json.dumps({
            "carrier_service": "ANTA",
            "conso_shipment_carrier": "ANTA",
            "order_no": reference_number,
            "pickup_tn_list": tracing_numbers,  # 使用传入的跟踪号列表
            "receiver": {
                "address": "福建省泉州市晋江市五里工业区安踏鞋材二厂3号仓库2楼（鸿达物流正对面）",
                "city": "XM",
                "company": "ANTA",
                "country_code": "CN",
                "name": "ANTAjjwh",
                "phone": "0595-85925070",
                "post_code": "361000",
                "province": "福建省"
            },
            "sender": {
                "address": "福建省泉州市晋江市五里工业区安踏鞋材二厂3号仓库2楼（鸿达物流正对面）",
                "city": "XM",
                "company": "ANTA",
                "country_code": "CN",
                "name": "ANTAjjwh",
                "phone": "0595-85925070",
                "post_code": "361000",
                "province": "福建省"
            },
            "shipment_term": "DDU",
            "tracking_number": reference_number
        })

        headers = {
            'token': 'eyJ0-W1l#3RhbXAiOjE2NDY^$DQ3$jk0$zYsIm5vbmNlIjoiV25BbVBYWX$iLCJ0b2tlbiI6IjdlNj$5$WI0LTgzOTQtNGE5NS1iOTBkLTg5$D#0ZTNkYmQ^$iJ9',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer xBfMWfrrD1x4dAtzdby87KHSMKMJMZ5rrMStbkJKF45QAXK55h4TEZY85SiAJcar'
        }

        response = requests.request("POST", url, headers=headers, data=payload)

        print(response.text)
        print(f"集运订单号: {reference_number}, 包含包裹数: {len(tracing_numbers)}")
        return reference_number

    def ops_inbound(self, tracking_number):
        url = "https://ops-eng-uat.kec-app.com/controller/conso/cargo/inbound"
        payload = {
            "scPickupTn": tracking_number,
            "actualWeight": 1230,
            "length": 12,
            "width": 12,
            "height": 12,
            "isReweight": 0,
            "inboundPictureUrl": "",
            "inboundPictureId": "",
            "isVol": 1
        }
        headers = {
            'Authorization': self.token,
            'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        print(json.loads(response.text)['msg'])

    def ops_put(self, tracking_number):

        url = "https://ops-eng-uat.kec-app.com//controller/conso/cargo/putOnShelf"
        payload = {
            "shelfNo": "ITTEST-01",
            "scPickupTn": tracking_number
        }
        headers = {
            'Authorization': self.token,
            'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        print(json.loads(response.text)['msg'])

    def ops_picking(self, kd, tracking_number):

        url = "https://ops-eng-uat.kec-app.com//controller/conso/cargo/picking"
        payload = {
            "consoOrderNo": kd,
            "scPickupTn": tracking_number
        }
        headers = {
            'Authorization': self.token,
            'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        # print(response.text)
        print(json.loads(response.text)['msg'])


# 使用示例
if __name__ == "__main__":
    cainiao = CaiNiao()

    # 创建多个包裹
    tracking_numbers = []
    for i in range(50):
        tracking_data = cainiao.create()
        tracking_numbers.append(tracking_data["trcking_number"])
        # 可选：执行入库等操作
        cainiao.ops_inbound(tracking_data["trcking_number"])
        cainiao.ops_put(tracking_data["trcking_number"])

    # 将多个包裹集运
    kd = cainiao.jiyun(tracking_numbers)

    # 可选：等待一段时间后执行拣货
    # time.sleep(30)
    # for tracking_number in tracking_numbers:
    #     cainiao.ops_picking(kd, tracking_number)