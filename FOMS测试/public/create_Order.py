import json

import datetime
import random

import requests



def create_Order(sku_number,properties,token):


    url = properties["url"] + "api/foms/v2/order/create"

    order_data = properties["order_data"]

    with open("../../FOMS测试/data/" + order_data, 'r',encoding= 'utf-8') as f:
        payload = json.loads(f.read())#转换成字典
        f.close()
    order_num = "BACK_OR"+ str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(0,9999999))
    payload["order_number"] = order_num
    # payload["logistics_provider"]["tracking_number"] = order_num
    payload["items"][0]["sku_code"] = sku_number
    headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data= json.dumps(payload))
    # print(response.text)
    if json.loads(response.text)['code'] in [202,201]:
        print("创建订单成功：" + order_num)
        return  order_num
    else:
        print("创建订单失败："+ order_num + response.text)
