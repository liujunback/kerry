import json
import time

import requests


def lagnxing_inbound(tracking_number):
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