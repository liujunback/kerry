import random
import urllib

import requests



class CaiNiao:
    def create(self):
        url = "http://120.24.31.239:20000//tms-saas-web/cainiao/order/lh_box_update?client=860906&channel="
        trcking_number = "TEST"+str(random.randint(1,9999999999))
        reference_number = "LPTEST"+str(random.randint(1,9999999999))
        box_number = "BOXTEST"+str(random.randint(1,9999999999))
        payload = {
            "logistics_interface":{
                                        "bigBagID":"BOXTEST982345743",
                                        "parcelList":[
                                        {
                                        "logisticsOrderCode":"LPTEST200536835",
                                        "trackingNumber":"TEST6658584873"
                                        },
                                        {
                                        "logisticsOrderCode":"LPTEST8281835617",
                                        "trackingNumber":"TEST1544394780"
                                        }
                                        ],
                                        "updateType":"DELETE"
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
        print("box_number:"+box_number)
        return trcking_number
CaiNiao.create(1)


