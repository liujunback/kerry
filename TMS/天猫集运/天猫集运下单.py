import json
import random
import urllib

import requests
import time


class CaiNiao:
    def create(self):
        url = "http://120.24.31.239:20000/tms-saas-web/cainiao-conso/cargo/create"
        trcking_number = "ITTEST"+str(random.randint(1,9999999999))
        reference_number = "TRTEST"+str(random.randint(1,9999999999))
        payload = {
            "logistics_interface":{
                                    "logisticsEvent":{
                                        "eventHeader":{
                                            "eventTime":"2017-05-14 08:00:00",
                                            "eventTimeZone":"UTC+8",
                                            "eventType":"CONSO_WAREHOUSE_CONSIGN"
                                        },
                                        "eventBody":{
                                            "logisticsDetail":{
                                                "isLastPackage":"Y",
                                                "orderSource":"1",
                                                "bizType":"CONSO",
                                                "consoWarehouseCode":"TRAN_STORE_31073541",
                                                "buyerDetail":{
                                                    "country":"中国",
                                                    "zipCode":"200000",
                                                    "town":"测试",
                                                    "city":"测试",
                                                    "mobile":"1345678901",
                                                    "membership":{
                                                        "paidType":"N",
                                                        "userLevel":"regularMember"
                                                    },
                                                    "wangwangId":"旺旺id",
                                                    "province":"上海",
                                                    "userRecogCode":"MDCLS",
                                                    "phone":"1",
                                                    "streetAddress":"xx路xx号",
                                                    "district":"测试",
                                                    "name":"测试",
                                                    "email":"jiyun@jiyun.com"
                                                },
                                                "length":"112",
                                                "deliveryType":"自提 或者 宅配",
                                                "logisticsOrderCode":reference_number,
                                                "weight":"112",
                                                "check":"true",
                                                "userid":"2206389788709",
                                                "grayTag":"true",
                                                "categoryFeature":"largenormal",
                                                "consoType":"1-包包计划",
                                                "mailNo":trcking_number,
                                                "isSplitConsign":"Y 或者 N",
                                                "carrierCode":"承运商编码",
                                                "goodsFeature":"normalmedicine",
                                                "width":"112",
                                                "packageQuantity":"3",
                                                "senderDetail":{
                                                    "country":"中国",
                                                    "zipCode":"310000",
                                                    "town":"测试",
                                                    "city":"测试",
                                                    "mobile":"1345678901",
                                                    "shopName":"测试账号",
                                                    "wangwangId":"测试",
                                                    "province":"测试",
                                                    "phone":"02188776655",
                                                    "streetAddress":"xx路xx号",
                                                    "district":"测试",
                                                    "name":"测试",
                                                    "email":"xxxx@seller.com"
                                                },
                                                "items":[
                                                    {
                                                        "itemId":"35363234",
                                                        "itemUnitPrice":"0",
                                                        "itemPicUrl":"3",
                                                        "itemName":"234534",
                                                        "itemQuantity":"3",
                                                        "itemSkuProperty":"测试32",
                                                        "currency":"CNY",
                                                        "categoryName":"12341234",
                                                        "totalActualPayment":"0",
                                                        "skuId":"2-12-123",
                                                        "categoryId":"294034",
                                                        "currencyUnit":"CENT"
                                                    }
                                                ],
                                                "height":"1"
                                            },
                                            "paymentDetail":{
                                                "tradeOrderValue":"0",
                                                "gstCurrency":"aus.rmb",
                                                "exchangeRate":"AUD-CNY-4.757000",
                                                "isLevyTax":"Y",
                                                "isPresent":"Y",
                                                "currency":"CNY",
                                                "totalShippingFee":"10",
                                                "totalTaxFee":"10",
                                                "currencyUnit":"CENT",
                                                "actualSenderName":"测试"
                                            },
                                            "tradeDetail":{
                                                "tradeOrderId":"7236482512924",
                                                "dereRecogCode":"YDUH5M12XSSWHW"
                                            }
                                        }
                                    }
                                },
            "msg_type":"1",
            "data_digest":"2",
            "partner_code":"3",
            "msg_id":"4",
            "from_code":5
        }

        files = []
        headers = {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
        response = requests.request("POST", url, headers=headers, data=urllib.parse.urlencode(payload), files=files)
        # print(response.text)
        print(trcking_number)
        # print(reference_number)
        return trcking_number
    def inbound(tracking_number):
        url = "http://120.24.31.239:20000//tms-saas-web/tms/conso/ops/event/inbound"
        payload={
                    "event_at": int(round(time.time() * 1000)),
                    "height": 6,
                    "length": 36,
                    "sc_pickup_tn": tracking_number,
                    "timezone": "+08:00",
                    "weight": 6700,
                    "width": 27
                }
        headers = {
          'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        print(response.text)

for i in range(5):
#
    tracking_number = CaiNiao.create(1)
#
    # CaiNiao.inbound(CaiNiao.create(1))
#TR7769174505 RE8696837097

# print(int(round(time.time() * 1000)))