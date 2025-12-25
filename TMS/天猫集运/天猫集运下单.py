import json
import random
import urllib

import requests
import time

from TMS.public.Controller_Login import Controller_Login


class CaiNiao:
    def create(self):
        url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/cainiao-conso/cargo/create"
        trcking_number = "YT" + str(random.randint(1, 9999999999))
        reference_number = "LP" + str(random.randint(1, 9999999999))
        payload = {
            "logistics_interface": {
                "logisticsEvent": {
                    "eventHeader": {
                        "eventTime": "2017-05-14 08:00:00",
                        "eventTimeZone": "UTC+8",
                        "eventType": "CONSO_WAREHOUSE_CONSIGN"
                    },
                    "eventBody": {
                        "logisticsDetail": {
                            "isLastPackage": "Y",
                            "orderSource": "1",
                            "bizType": "CONSO",
                            "consoWarehouseCode": "TRAN_STORE_31069045",
                            "buyerDetail": {
                                "country": "中国",
                                "zipCode": "200000",
                                "town": "测试",
                                "city": "测试",
                                "mobile": "1345678901",
                                "membership": {
                                    "paidType": "N",
                                    "userLevel": "regularMember"
                                },
                                "wangwangId": "旺旺id",
                                "province": "上海",
                                "userRecogCode": "MDCLS",
                                "phone": "1",
                                "streetAddress": "xx路xx号",
                                "district": "测试",
                                "name": "测试",
                                "email": "jiyun@jiyun.com"
                            },
                            "length": "112",
                            "deliveryType": "自提 或者 宅配",
                            "logisticsOrderCode": reference_number,
                            "weight": "112",
                            "check": "true",
                            "userid": "2206389788709",
                            "grayTag": "true",
                            "categoryFeature": "largenormal",
                            "consoType": "1-包包计划",
                            "mailNo": trcking_number,
                            "isSplitConsign": "Y 或者 N",
                            "carrierCode": "承运商编码",
                            "goodsFeature": "normalmedicine",
                            "width": "112",
                            "packageQuantity": "3",
                            "senderDetail": {
                                "country": "中国",
                                "zipCode": "310000",
                                "town": "测试",
                                "city": "测试",
                                "mobile": "1345678901",
                                "shopName": "测试账号",
                                "wangwangId": "测试",
                                "province": "测试",
                                "phone": "02188776655",
                                "streetAddress": "xx路xx号",
                                "district": "测试",
                                "name": "测试",
                                "email": "xxxx@seller.com"
                            },
                            "items": [
                                {
                                    "itemId": "35363234",
                                    "itemUnitPrice": "0",
                                    "itemPicUrl": "3",
                                    "itemName": "234534",
                                    "itemQuantity": "3",
                                    "itemSkuProperty": "测试32",
                                    "currency": "CNY",
                                    "categoryName": "12341234",
                                    "totalActualPayment": "0",
                                    "skuId": "2-12-123",
                                    "categoryId": "294034",
                                    "currencyUnit": "CENT"
                                }
                            ],
                            "height": "1"
                        },
                        "paymentDetail": {
                            "tradeOrderValue": "0",
                            "gstCurrency": "aus.rmb",
                            "exchangeRate": "AUD-CNY-4.757000",
                            "isLevyTax": "Y",
                            "isPresent": "Y",
                            "currency": "CNY",
                            "totalShippingFee": "10",
                            "totalTaxFee": "10",
                            "currencyUnit": "CENT",
                            "actualSenderName": "测试"
                        },
                        "tradeDetail": {
                            "tradeOrderId": "7236482512924",
                            "dereRecogCode": "YDUH5M12XSSWHW"
                        }
                    }
                }
            },
            "msg_type": "1",
            "data_digest": "2",
            "partner_code": "3",
            "msg_id": "4",
            "from_code": 5
        }

        files = []
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        response = requests.request("POST", url, headers=headers, data=urllib.parse.urlencode(payload), files=files)
        # print(response.text)
        print(trcking_number)
        return {"reference_number":reference_number,"trcking_number":trcking_number}
    def jiyun(tracing_number):
        url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/cainiao-conso/conso-order/create?cainiao_channel=CTCNTH000"
        reference_number = "LP" + str(random.randint(1, 9999999999))
        payload = {
            "logistics_interface": {
                    "logisticsEvent": {
                        "eventHeader": {
                            "eventTime": "2025-01-13 05:45:53",
                            "eventType": "CONSO_WAREHOUSE_OUTBOUND_NOTICE"
                        },
                        "eventBody": {
                            "logisticsDetail": {
                                "lastMileDeliveryType": "HOME_DELIVERY",
                                "orderSource": "1",
                                "bizType": "CONSO4PL",
                                "consoWarehouseCode": "TRAN_STORE_31341967",
                                "carrierCode": "DISTRIBUTOR_31331512",
                                "logisticsOrderCode": reference_number,
                                "receiverDetail": {
                                    "country": "菲律宾",
                                    "zipCode": "1503",
                                    "city": "San Juan City",
                                    "mobile": "63-9171001919",
                                    "membership": {
                                    },
                                    "wangwangId": "tb467665449178",
                                    "areaId": "166",
                                    "province": "Metro Manila~San Juan",
                                    "userRecogCode": "R96C61K3",
                                    "streetAddress": "Unit 45E Viridian in Greenhills Missouri St",
                                    "district": "Greenhills",
                                    "name": "Alexandra Coronel",
                                    "divisionId": "166"
                                },
                                "transportType": "AIRE",
                                "outboundLogisticsOrderCodes": tracing_number,
                                "segmentCode": "SENDTORECVER",
                                "majorlogisticsOrderCode": "ITTEST20250113008",
                                "solutionCode": "TMALL_CONSO_AIR_4PL"
                            },
                            "paymentDetail": {
                                "payOrderId": "4202031818420744914",
                                "payTimeZone": "UTC+8",
                                "shippingFee": "54500",
                                "payTime": "2025-01-12 23:57:10",
                                "payWeight": "14791",
                                "currency": "CNY",
                                "currencyUnit": "CENT",
                                "weightUnit": "GRAM"
                            },
                            "extendData": {
                                "bbOperMark": "N",
                                "feature": {
                                    "importCustomsResCode": "GATE_31331329"
                                },
                                "needSecMeasure": "N",
                                "promotionMoney": "0",
                                "bbFlag": "N"
                            }
                        }
                    }
                },
            "msg_type": "1",
            "data_digest": "2",
            "partner_code": "3",
            "msg_id": "4",
            "from_code": 5
        }

        files = []
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        response = requests.request("POST", url, headers=headers, data=urllib.parse.urlencode(payload), files=files)
        print(response.text)
        return reference_number


    def ops_inbound(tracking_number):
        token = Controller_Login()
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
            'Authorization': token,
            'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        print(json.loads(response.text)['msg'])

    def ops_put(tracking_number):
        token = Controller_Login()
        url = "https://ops-eng-uat.kec-app.com//controller/conso/cargo/putOnShelf"
        payload = {
                      "shelfNo": "ITTEST-01",
                      "scPickupTn": tracking_number
                    }
        headers = {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        print(json.loads(response.text)['msg'])
    def ops_picking(kd,tracking_number):
        token = Controller_Login()
        url = "https://ops-eng-uat.kec-app.com//controller/conso/cargo/picking"
        payload = {
              "consoOrderNo": kd,
              "scPickupTn": tracking_number
            }
        headers = {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        # print(response.text)
        print(json.loads(response.text)['msg'])

for i in range(3):
    tracking_data = CaiNiao.create(1)
    # tracking_number = "ITTEST20251211002"
    CaiNiao.ops_inbound(tracking_data["trcking_number"])
    CaiNiao.ops_put(tracking_data["trcking_number"])
    # kd = CaiNiao.jiyun(tracking_data["reference_number"])
    # time.sleep(30)
    # print(kd)
    # CaiNiao.ops_picking(kd,tracking_data["trcking_number"])