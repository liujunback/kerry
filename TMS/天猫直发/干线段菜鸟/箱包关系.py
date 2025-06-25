import random
import urllib

import requests



class CaiNiao:
    def create(self):
        url = "http://120.24.31.239:20000//tms-saas-web/cainiao/order/lh_box_notify?client=860906&channel=LTCNTH008"
        box_number = "BOXTEST"+str(random.randint(1,9999999999))
        payload = {
            "logistics_interface":{
                                        "preCPResCode":"STORE_12720648",
                                        "stationCode":"xxx",
                                        "labelWeight":"1234",
                                        "bizType":"BCD",
                                        "currentCPResCode":"TRUNK_11750293",
                                        "laneCode":"xxx",
                                        "parcelList":[
                                            {
                                                "logisticsOrderCode":"LPTEST8281835617",
                                                "trackingNumber":"TEST1544394780"
                                            }
                                        ],
                                        "standardWeight":"1234",
                                        "sortCode":"YW1234",
                                        "lhWhHandoverCode":"xxx",
                                        "toCountryCode":"RU",
                                        "fromPortCode":"SZX",
                                        "packingWeight":"1234",
                                        "grossWeight":"1234",
                                        "netWeight":"1234",
                                        "sender":{
                                            "userId":"111111"
                                        },
                                        "bigBagID":box_number,
                                        "parcelQty":"123",
                                        "declarationLocationCode":"xxx",
                                        "weightUnit":"g"
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
        print("tracking_number:"+payload['logistics_interface']['parcelList'][0]['trackingNumber'])
        print("reference_number:"+payload['logistics_interface']['parcelList'][0]['logisticsOrderCode'])
        print("box_number:"+box_number)
CaiNiao.create(1)


