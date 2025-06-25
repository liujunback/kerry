import ast
import random

import requests
import json
from TMS.public.Login import login

def Multiple_order(count_number):
    token=login()
    url = "http://47.119.120.7:8000/pos-web/shipment/create/multiple"
    headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
    payload = {
                  "bag_id": "TEST708430",
                  "bag_weight": 151,
                  "bag_length": 52,
                  "bag_width": 55,
                  "bag_height": 45,
                  "package_list": []
                }
    param2 = ast.literal_eval(open("../file_data/order_data.txt", encoding="UTF-8").read())#转换成字典
    for i in range(count_number):
        reference_number="TH232"+str(random.randint(1,99999999999999))
        param2['package']['reference_number']=reference_number
        payload["package_list"].append(param2)
    #print(json.dumps(payload))
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    print(response.text)

Multiple_order(500)








