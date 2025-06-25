import json
import random

import datetime
import requests
import time


def file_create_order(token):
    # reference_number="PP24013013743895347249968"
    header = {
        'Content-Type':'application/json',
        "Authorization":"Bearer"+" "+token
        }
    with open("../file_data/order_data.txt", 'r',encoding= 'utf-8') as f:
        param2 = json.loads(f.read())#转换成字典
        f.close()

    reference_number="TESTBACK"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,300))
    #
    param2['package']['reference_number']=reference_number
    # param2['package']['tracking_number']=reference_number
    url = "http://47.119.120.7:22900/pos-web/shipment/create"
    time_start = time.time()
    response = requests.post(url ,data=json.dumps(param2), headers = header)
    time_end = time.time()
    print(reference_number)
    print('下单耗时：', round(time_end - time_start, 2), 's')
    if response.status_code ==201:
        print(response.text)
        # print(json.loads(response.text)["data"]["label_url"])
        print(json.loads(response.text)["data"]["tracking_number"])
        # success_length = open('../request_data/success_length.txt', 'ab')
        # success_length.write(((json.loads(response.text)["data"]["tracking_number"])+"\n").encode('utf-8'))
        return json.loads(response.text)["data"]["tracking_number"]
        # success_length.close()
    else:
        # print(reference_number)
        print(response.text)
        return "失败"


