
import json

import datetime
import random

import requests




def create_SKU(properties,token):
    import requests
    sku_number = "BACK_SKU"+ str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(0,9999999))


    url = properties['url'] + "/api/foms/v2/sku/create"
    sku_data =  properties['sku_data']

    with open("../../FOMS测试/data/" + sku_data, 'r',encoding= 'utf-8') as f:
        payload = json.loads(f.read())#转换成字典
        f.close()
    payload["sku_code"] = sku_number

    payload["barcodes"][0] = sku_number

    headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    print(response.text)
    if  "Created" in response.text:
        print("创建SKU成功：" + sku_number)
        return sku_number
    else:
        print(sku_number  + response.text)

