
import json
import datetime
import requests


def bag_creat(order_list):
    url = "http://120.24.31.239:20000/tms-saas-web/wish/bag/create"
    box_num = "WISH0729"+str((datetime.datetime.now()).strftime('%Y%m%d%H%M'))
    payload={
             "bags": [{
              "ref_bag_number":box_num,
              "bag_number": box_num,
              "declared_weight": 4,
              "orders": order_list
             }]
            }
    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["message"] == "success":
        return box_num
    print(response.text)

