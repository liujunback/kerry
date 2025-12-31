import json

import datetime
import random

import requests


def slug_test():


    service_urls = ["https://spider.kec-app.com/"]
    reference_number = "ITTEST"+ str(datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
    with open("../../生产主流程/slug/data_slug.txt", 'r',encoding= 'utf-8') as f:
            payload = json.loads(f.read())#转换成字典
            f.close()
    for i in range(2):
        service_url =service_urls[0]
        url = service_url + "/package/booking"
        #url = "http://120.78.66.231:8000/pos-web/token/get" #生产
        payload['package']['shipper_reference_id'] = reference_number+ str(i)
        payload['package']['order_number'] = "TEST"+ str(datetime.datetime.now().strftime('%m%d%H%M%S')) + str(i)
        headers = {
                  'Authorization': 'Bearer e0J7AjwuDEsNb2sJxTgEZq4cQPXvlyMyL7v8nk4m3vfmgrJk1KKuDl91zfKr',
                  'Content-Type': 'application/json'
                }

        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        if "201001" in response.text:
            print(json.loads(response.text)['data']['tracking_number'])
        else:
            print(response.text)
            # response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
            print( reference_number+ str(i))

slug_test()