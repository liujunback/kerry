import json
import time

import requests


def lagnxing_consolidated(sc_numbers,tracking_number):
    import requests

    url = "http://120.24.31.239:20000//tms-saas-web/tms/conso/ops/event/consolidated"

    payload={
                    "cargo_list": sc_numbers,
                    "conso_tn": tracking_number,
                    "event_at": int(round(time.time() * 1000)),
                    "timezone": "+08:00"
            }

    headers = {
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    print(response.text)