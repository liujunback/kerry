import json
import random
import time

import datetime
import requests
import urllib3
from urllib3.exceptions import InsecureRequestWarning

from 生产主流程.properties.GetProperties import getProperties

urllib3.disable_warnings(InsecureRequestWarning)


def date(pakege_list, properties):
    order_url = properties['order_txt']
    date={
            "bag_id":"",
            "bag_weight":"7320",
            "bag_length":"312",
            "bag_width":10,
            "bag_height":2
        }
    date["bag_id"]="BACKTEST"+str((datetime.datetime.now()).strftime('%Y%m%d%H%M'))
    x=[]
    for i in range(pakege_list):
        with open("../../生产主流程/data/" + order_url, 'r',encoding= 'utf-8') as f:
            a = json.loads(f.read())#转换成字典
            f.close()
            a["package"]["reference_number"]="ITTEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))+str(random.randint(0,999))
        x.append(a)
    date["package_list"]=x
    return date

def Big_Bag_Create(pakege_list,token,properties):
    header={"Content-Type":"application/json","Authorization":"Bearer "+token}
    url = properties['url']+"pos-web/shipment/create/multiple"
    data = json.dumps(date(pakege_list, properties))
    response=requests.post(url,data=data,headers=header,verify=False)
    time_start = time.time()
    request=json.loads(json.dumps(response.text))
    time_end = time.time()
    print('下单耗时：', round(time_end - time_start, 3), 's')
    if response.status_code == 201:
        print("Big:"+request)
        return json.loads(response.text)["data"]["bag_id"]
