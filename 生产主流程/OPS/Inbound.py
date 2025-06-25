import json
import requests
import time



def OPS_Inbound(tracking_number, properties, token):

    url = properties['ops_url']
    url = url + "/inbound/package/hand"
    # print(url)
    payload={
            "token":token,
            "height":140,
            "isPrint":0,
            "isVol":1,
            "length":120,
            "trackingNumber":tracking_number,
            "width":130,
            "weight":1001
        }
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload),verify=False)
    if json.loads(response.text)["code"] != 200:
        print(response.text)
    print(json.loads(response.text)["msg"])
