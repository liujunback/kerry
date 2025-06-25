import json

import datetime
import requests

def sign_in_order(aliOrderNo):

    url = "http://120.24.31.239:20000//tms-saas-web/icbu-wh/operation"

    payload={
        "aliOrderNo": aliOrderNo,
        "eventTime": str(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
        "eventCode": "WAREHOUSE_SIGN",
        "status": "SUCCESS",
        "location": "YiWu",
        "reason": "",
        "extInfo": [
           aliOrderNo
        ]
    }
    headers = {
      'token': 'eyJ0-W1l#3RhbXAiOjE2Nz$1OD#5NjU^$TgsIm5vbmNlIjoiOXFBV2gwb0oiLCJ0b2tlbiI6ImJiZWUyODE2LTY0$DgtNDZhOS1i$WIzLTU4ZjYzNTJlYzk3$iJ9',
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

    print(response.text)