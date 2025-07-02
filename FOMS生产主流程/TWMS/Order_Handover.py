import json
import re

import requests




def order_handover(properties,twms_login,tracking_number):
    url = properties["twms_url"] + "/opt/scan/handover-by-tracking-number"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': twms_login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + twms_login['cookies']['XSRF-TOKEN'] + '; laravel_session='+twms_login['cookies']['laravel_session']
    }
    payload={
        "tracking_numbers[]":[tracking_number],
        "agent":" KEC-TESTGX",
        "actualLpCode":""
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    if "Logout" in response.text or json.loads(response.text)['code'] == 200:
        print("移交成功：" + tracking_number)
    else:
        print("移交失败：" + response.text)


