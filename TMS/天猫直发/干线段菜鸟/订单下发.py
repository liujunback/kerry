import random
import urllib

import requests



class CaiNiao:
    def create(self):
        url = "http://120.24.31.239:20000//tms-saas-web/cainiao/order/lh_notify?client=860906&channel=LTCNTH008"
        trcking_number = "TEST"+str(random.randint(1,9999999999))
        reference_number = "LPTEST"+str(random.randint(1,9999999999))
        box_number = "BOXTEST"+str(random.randint(1,9999999999))
        payload = {
            "logistics_interface":{
                                    "mailBoxItem":"Y",
                                    "waybillNumber":"RU00212323",
                                    "consumerDeliveryFee":"1.234",
                                    "fromPortCode":"SZX",
                                    "deliverType":"1",
                                    "pickupTime":"2017-03-10 11:20:00",
                                    "customs":{
                                        "birthday":"2017/12/23",
                                        "passportInfo":"PTW5/2STFmwPYpUl3EdvcQ",
                                        "taxTotal":"50",
                                        "customsName":"customsName",
                                        "cpf":"cpf",
                                        "customsContact":"customsContact",
                                        "declarePriceTotal":"500",
                                        "taxNumber":"taxNumber",
                                        "passportExpireDate":"",
                                        "passportIssueDate":"2006/1/1",
                                        "passportHolderName":"WangLi",
                                        "customsCode":"customsCode"
                                    },
                                    "toPortCode":"ORD",
                                    "trackingNumber":trcking_number,
                                    "parcel":{
                                        "bigBagID":box_number,
                                        "subParcelQuantity":"1",
                                        "bigBagDimensionUnit":"cm",
                                        "bigBagWidth":"1000",
                                        "bigBagWeightUnit":"g",
                                        "masterParcelTrackingNumber":"TN000628588232767",
                                        "totalPiecesInPackage":"1",
                                        "totalCodAmount":"122",
                                        "dimensionUnit":"cm",
                                        "bigBagLength":"1000",
                                        "goodsList":[
                                            {
                                                "securityCategoryName":"蓝牙耳机",
                                                "extension":"extension information",
                                                "productID":"32681820727",
                                                "itemProperty":"商品属性",
                                                "declarePrice":"2696",
                                                "categoryName":"glassware",
                                                "mailTaxNumber":"mailTaxNumber",
                                                "productCategory":"productCategory",
                                                "securityLevel":"BLACK",
                                                "price":"2696",
                                                "suggestedCNName":"牙刷",
                                                "categoryID":"2321",
                                                "priceUnit":"CENT",
                                                "securityLogisticsAttributes":"FORBID",
                                                "quantity":"1",
                                                "securityCheckDescription":"文案",
                                                "weight":"1100",
                                                "tax":"1231",
                                                "categoryCNName":"玻璃制品",
                                                "url":"http://www.aliexpress.com/item//32681820727.html",
                                                "categoryFeature":"00",
                                                "codValue":"cod",
                                                "localName":"玻璃制品",
                                                "priceCurrency":"USD",
                                                "cnName":"玻璃制品",
                                                "hsCode":"8400000001",
                                                "name":"glassware",
                                                "itemPrice":"0",
                                                "suggestedENName":"toothbrush",
                                                "skuID":"539230",
                                                "weightUnit":"g"
                                            }
                                        ],
                                        "volumeUnit":"cm3",
                                        "payWeight":"1450",
                                        "paymentType":"cod",
                                        "masterID":"FM102",
                                        "price":"2696",
                                        "asnID":"asnID",
                                        "masterParcelLogisticsOrderCode":reference_number,
                                        "itemWeight":"1450",
                                        "height":"100",
                                        "subParcelList":[
                                            {
                                                "subParcelID":"1234",
                                                "inboundTime":"2018/3/1",
                                                "length":"100",
                                                "dimensionUnit":"cm",
                                                "weight":"1100",
                                                "logisticsOrderCode":reference_number,
                                                "parcelSizeType":"small",
                                                "categoryFeature":"00",
                                                "packageCode":"XMLP0006285884676701",
                                                "width":"100",
                                                "trackingNumber":"LB585607937BE",
                                                "tradeID":"41038563",
                                                "height":"100",
                                                "weightUnit":"g"
                                            }
                                        ],
                                        "priceUnit":"CENT",
                                        "parcelQuantity":"25",
                                        "length":"100",
                                        "weight":"1450",
                                        "bigBagWeight":"1100",
                                        "airID":"UA998",
                                        "suggestedWeight":"1450",
                                        "packingType":"S",
                                        "parcelInspection":"BLACK_CONTRABAND",
                                        "volume":"122",
                                        "size":"Small",
                                        "IOSSNo":"258809.",
                                        "width":"100",
                                        "bigBagHeight":"1000",
                                        "weightUnit":"g"
                                    },
                                    "interCPResCode":"DISTRIBUTOR_766143",
                                    "specialOrderType":"globalFreeShipping",
                                    "receiver":{
                                        "zipCode":"101110",
                                        "address":{
                                            "country":"TH",
                                            "province":"he bei sheng",
                                            "city":"cang zhou shi",
                                            "street":"he fang jie",
                                            "district":"xin hua qu",
                                            "detailAddress":"cang zhou kai fa qu~~~jia xing wu liu yuan A22-28"
                                        },
                                        "phone":"18231730588",
                                        "cpreceiverCode":"cpreceiverCode",
                                        "identity":{
                                            "id":"7645345",
                                            "type":"type"
                                        },
                                        "name":"glassware",
                                        "mobile":"86-18231730588",
                                        "imID":"cn1518208075sucs",
                                        "email":"529932298@qq.com"
                                    },
                                    "shippingClearanceInfo":{
                                        "voyageNo":"19049-19050",
                                        "shippingCompanyNo":"130280D",
                                        "sealNo":"WSC000432",
                                        "arriveDate":"2019-03-04",
                                        "imo":"9213492",
                                        "contType":"2200",
                                        "pol":"CNPIN",
                                        "contNo":"WGSU2403205",
                                        "vesselCallsign":"BIBD",
                                        "partyIdentifier":"174",
                                        "contTransmodel":"2"
                                    },
                                    "directFlag":"Y",
                                    "splitNum":"4",
                                    "timeZone":"3",
                                    "sortCode":"1",
                                    "buyer":{
                                        "zipCode":"101110",
                                        "address":{
                                            "country":"TH",
                                            "province":"he bei sheng",
                                            "city":"cang zhou shi",
                                            "street":"he fang jie",
                                            "district":"xin hua qu",
                                            "detailAddress":"cang zhou kai fa qu~~~jia xing wu liu yuan A22-28"
                                        },
                                        "phone":"18231730588",
                                        "identity":{
                                            "id":"7645345",
                                            "type":"type"
                                        },
                                        "name":"glassware",
                                        "mobile":"86-18231730588",
                                        "imID":"cn1518208075sucs",
                                        "email":"529932298@qq.com"
                                    },
                                    "consoCPResCode":"TRAN_STORE_30318245",
                                    "flightNo":"KL888",
                                    "sender":{
                                        "zipCode":"101110",
                                        "storeType":"storeType",
                                        "address":{
                                            "country":"CN",
                                            "province":"he bei sheng",
                                            "city":"cang zhou shi",
                                            "street":"he fang jie",
                                            "district":"xin hua qu",
                                            "detailAddress":"cang zhou kai fa qu~~~jia xing wu liu yuan A22-28"
                                        },
                                        "companyName":"yanwen",
                                        "mobile":"86-18231730588",
                                        "sellerCompanyName":"xxxx",
                                        "storeID":"2216020",
                                        "imID":"cn1518208075sucs",
                                        "companyID":{
                                            "id":"7645345",
                                            "type":"type"
                                        },
                                        "phone":"18231730588",
                                        "identity":{
                                            "id":"7645345",
                                            "type":"type"
                                        },
                                        "storeUrl":"https://jumper.aliexpress.com/store/99999F",
                                        "name":"Json",
                                        "storeName":"StoreABC",
                                        "email":"529932298@qq.com"
                                    },
                                    "carrierCode":"carrierCode",
                                    "present":"true",
                                    "alipayUserName":"张三",
                                    "isMorePackage":"Y",
                                    "sellerTaxNumber":"？？？",
                                    "dutyType":"DDU/DDP",
                                    "bizType":"AE_4PL_ONLINE",
                                    "logisticsOrderCode":reference_number,
                                    "routingTrial":"1",
                                    "remark":"remark string",
                                    "membership":{
                                        "paidType":"Y",
                                        "userLevel":"regularMember"
                                    },
                                    "cloudPrintData":"{\"data\":\"abc\" }",
                                    "popStation":{
                                        "zipCode":"101110",
                                        "address":{
                                            "country":"China",
                                            "province":"he bei sheng",
                                            "city":"cang zhou shi",
                                            "street":"he fang jie",
                                            "district":"xin hua qu",
                                            "detailAddress":"cang zhou kai fa qu~~~jia xing wu liu yuan A22-28"
                                        },
                                        "phone":"18231730588",
                                        "name":"glassware",
                                        "id":"7645345"
                                    },
                                    "invoiceNumber":"？？？",
                                    "shippingPaymentInfo":{
                                        "priceUnit":"CENT",
                                        "priceCurrency":"USD",
                                        "price":"2323",
                                        "adjustPrice":"1000",
                                        "paymentTime":"2017-03-14 12:00:00",
                                        "paymentOrderCode":"SB12345678",
                                        "actualPaymentPrice":"2696"
                                    },
                                    "tmallCoverDeliveryFee":"1.234",
                                    "BBPlanFlag":"Y",
                                    "nextCPResCode":"Tran_test",
                                    "preCPResCode":"Tran_test",
                                    "outboundTime":"2017-03-14 12:00:00",
                                    "currentCPResCode":"Tran_test12",
                                    "tmallCoverGstTaxFee":"1.234",
                                    "laneCode":"L_AE_DHLE",
                                    "transportCode":"transportCode",
                                    "pickup":{
                                        "zipCode":"101110",
                                        "address":{
                                            "country":"China",
                                            "province":"he bei sheng",
                                            "city":"cang zhou shi",
                                            "street":"he fang jie",
                                            "district":"xin hua qu",
                                            "detailAddress":"cang zhou kai fa qu~~~jia xing wu liu yuan A22-28"
                                        },
                                        "phone":"18231730588",
                                        "name":"glassware",
                                        "mobile":"86-18231730588",
                                        "email":"529932298@qq.com"
                                    },
                                    "logisticsOrderCreateTime":"2017-03-10 11:20:00",
                                    "waybillUrl":"waybillUrl",
                                    "segmentCode":"segmentCode",
                                    "gstTaxFee":"1.234",
                                    "customRut":"???",
                                    "sortingCenterResCode":"TRAN_STORE_30318245",
                                    "trade":{
                                        "priceUnit":"CENT",
                                        "gstAmount":"1431",
                                        "gstExchangeRate":"6.171",
                                        "priceCurrency":"USD",
                                        "gstCurrency":"USD",
                                        "price":"2696",
                                        "requireGST":"true",
                                        "purchaseTime":"2017-03-10 11:20:00",
                                        "tradeID":"365456454"
                                    },
                                    "packageCode":"FU2020089100001145310252",
                                    "consoTag":"J1",
                                    "returnParcel":{
                                        "undeliverableOption":"2",
                                        "zipCode":"101110",
                                        "address":{
                                            "country":"China",
                                            "province":"he bei sheng",
                                            "city":"cang zhou shi",
                                            "street":"he fang jie",
                                            "district":"xin hua qu",
                                            "detailAddress":"cang zhou kai fa qu~~~jia xing wu liu yuan A22-28"
                                        },
                                        "phone":"18231730588",
                                        "name":"glassware",
                                        "mobile":"86-18231730588",
                                        "imID":"cn1518208075sucs",
                                        "email":"529932298@qq.com"
                                    },
                                    "tradeList":[
                                        {
                                            "gstAmount":"12",
                                            "gstExchangeRate":"1.234",
                                            "gstCurrency":"RMB",
                                            "requireGST":"true: 需征税；false: 不许征税",
                                            "alipayUserName":"张三",
                                            "present":"true: 馈赠；false: 非馈赠",
                                            "tradeId":"12345678"
                                        }
                                    ]
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
        print("box_number:"+box_number)
        return trcking_number
CaiNiao.create(1)


