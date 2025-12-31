
# for a in range(1):
import json
import os
import random

import time

import requests
from HelloWorld.public.login import login


def date(pakege_list,country):
    date={"bag_id":"","bag_weight":"123","bag_length":"312","bag_width":10,"bag_height":2}
    date["bag_id"]="TESTBOX"+str(random.randint(1000,999999))
    x=[]
    for i in range(pakege_list):
        with open(str(os.getcwd()+"/HelloWorld/public/data/"+country+".txt"), 'r',encoding= 'utf-8') as f:
            param2 = json.loads(f.read())#转换成字典
            f.close()
        reference_number=country+str(random.randint(1,99999999999999))
        param2['package']['reference_number']=reference_number
        x.append(param2)
    date["package_list"]=x
    token=login()
    header={"Content-Type":"application/json","Authorization":"Bearer "+token}
    r1=requests.post("http://47.119.120.7:8000/pos-web/shipment/create/multiple",data=json.dumps(date),headers=header)
    return json.loads(r1.text)



