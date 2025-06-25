import random
import urllib

import requests



class CaiNiao:
    def create(self):
        url = "http://120.24.31.239:20000/tms-saas-web/cainiao/order/create?channel_code=860777"
        trcking_number = "BACKTES"+str(random.randint(1,9999999999))
        reference_number = "LP"+str(random.randint(1,9999999999))
        courier_number = "BOXTEST"+str(random.randint(1,9999999999))
        payload = {
            "logistics_interface":{
                                    "preCPResCode":"Tran_Store_13093301",
                                    "seller":{
                                        "zipCode":"30100",
                                        "address":{
                                            "country":"美国",
                                            "province":"悉尼",
                                            "city":"波特兰",
                                            "street":"test道",
                                            "district":"X县",
                                            "detailAddress":"X3433室"
                                        },
                                        "phone":"12345678",
                                        "identity":{
                                            "id":"421024198412022530",
                                            "type":"ID"
                                        },
                                        "name":"张三",
                                        "mobile":"12345678",
                                        "imID":"a123",
                                        "email":"zhangsan@mama.com"
                                    },
                                    "pickupResName":"",
                                    "parcel":{
                                        "priceUnit":"CENT",
                                        "goodsList":[
                                            {
                                                "priceUnit":"CENT",
                                                "quantity":"1",
                                                "productID":"32681820727",
                                                "itemProperty":"颜色分类: 黑色尺寸: 15寸",
                                                "categoryName":"121184",
                                                "url":"http://www.aliexpress.com/item//32681820727.html",
                                                "categoryFeature":"01",
                                                "priceCurrency":"USD",
                                                "hsCode":"hs00",
                                                "price":"2696",
                                                "name":"glassware",
                                                "itemPrice":"0",
                                                "skuID":"539230",
                                                "categoryID":"2321"
                                            }
                                        ],
                                        "length":"10",
                                        "dimensionUnit":"mm",
                                        "weight":"123",
                                        "payWeight":"123",
                                        "suggestedWeight":"123",
                                        "parcelInspection":"Y",
                                        "categoryFeature":"00",
                                        "price":"10",
                                        "width":"10",
                                        "itemWeight":"123",
                                        "weightUnit":"g",
                                        "height":"10"
                                    },
                                    "bizType":"CN_4PL_CONSOLIDATION",
                                    "currentCPResCode":"TRAN_STORE_30741663",
                                    "receiver":{
                                        "zipCode":"24000",
                                        "address":{
                                            "country":"yuen",
                                            "province":"俄勒冈州",
                                            "city":"波特兰",
                                            "street":"X街道",
                                            "district":"X县",
                                            "detailAddress":"X幢X室"
                                        },
                                        "phone":"12345678",
                                        "identity":{
                                            "id":"421024198412022530",
                                            "type":"ID"
                                        },
                                        "name":"LiSi",
                                        "mobile":"12345678",
                                        "imID":"a123456",
                                        "email":"lisi@mama.com"
                                    },
                                    "logisticsOrderCode":reference_number,
                                    "consolidationCode":"code01",
                                    "combinePriority":"prior",
                                    "buyer":{
                                        "zipCode":"3000",
                                        "address":{
                                            "country":"美国",
                                            "province":"俄勒冈州",
                                            "city":"波特兰",
                                            "street":"X街12道",
                                            "district":"X县",
                                            "detailAddress":"X幢X室"
                                        },
                                        "userRecogCode":"test",
                                        "phone":"12345678",
                                        "identity":{
                                            "id":"421024198412022530",
                                            "type":"ID"
                                        },
                                        "name":"test",
                                        "mobile":"123456",
                                        "imID":"a123456",
                                        "email":"zhangsan@my.com"
                                    },
                                    "deliverType":"1",
                                    "mailNo":"AB123",
                                    "trade":{
                                        "priceUnit":"分",
                                        "priceCurrency":"CNY",
                                        "price":"10",
                                        "codEnable":"是否COD",
                                        "purchaseTime":"2018-09-09 20:18:48",
                                        "tradeID":"124342342"
                                    },
                                    "cloudPrintData":"data",
                                    "sender":{
                                        "zipCode":"30100",
                                        "address":{
                                            "country":"美国",
                                            "province":"俄勒冈州",
                                            "city":"波特兰",
                                            "street":"test街道",
                                            "district":"X123县",
                                            "detailAddress":"X幢X室"
                                        },
                                        "phone":"12345678",
                                        "identity":{
                                            "id":"421024198412022530",
                                            "type":"ID"
                                        },
                                        "name":"张三",
                                        "mobile":"12345678",
                                        "imID":"a123",
                                        "email":"zhangsan@mama.com"
                                    },
                                    "popStation":{
                                        "id":"7645345"
                                    },
                                    "carrierCode":"TRUNK_13168300",
                                    "domesticLogistics":{
                                        "expressCompanyCode":"X123",
                                        "trackingNumber":courier_number,
                                        "expressCompanyName":"X公司"
                                    },
                                    "pickupResCode":"",
                                    "trackingNumber":trcking_number,
                                    "nextCPResCode":"TRUNK_13168300"
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
        # print(json.dumps(payload))
        response = requests.request("POST", url, headers=headers, data=urllib.parse.urlencode(payload), files=files)
        print(response.text)
        print("tracking_number:"+trcking_number)
        print("reference_number:"+reference_number)
        print("courier_number:"+courier_number)
        return trcking_number
