
import json

import datetime
import random

import requests




def create_ASN(sku_number,properties,token):
    asn_data = properties['asn_data']
    url = properties['url'] + "/api/foms/v2/asn/create"
    with open("../../FOMS生产主流程/data/" + asn_data, 'r',encoding= 'utf-8') as f:
        payload = json.loads(f.read())#转换成字典
        f.close()
    asn_number = "BACKASN"+ str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(0,9999999))
    payload["asn_number"] = asn_number
    payload["items"][0]["sku_code"] = sku_number
    payload["asn_date"] = str((datetime.datetime.now()).strftime('%Y-%m-%d'))
    headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data= json.dumps(payload))
    if  "Created" in response.text:
        print("创建ASN成功：" + asn_number)
        return asn_number
    else:
        print(asn_number + ":" + response.text)
