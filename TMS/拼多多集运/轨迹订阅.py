import json

import requests


def tracking_status(trackingNumber):

    url = "http://120.24.31.239:20000//tms-saas-web/pdd-conso/pdd.service.conso.reverse.subscribe"

    payload={"ship_id":"2341123",
            "data":"{\"trackingNumber\":\""+trackingNumber+"\",\"trackingOrderNo\":\""+trackingNumber+"\"}"}

    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

    print(response.text)
