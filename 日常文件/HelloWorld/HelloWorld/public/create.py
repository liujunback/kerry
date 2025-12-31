import json
import random

import openpyxl
import requests
import sys
import importlib

import os

def create_order(token,country):
    header = {
        'Content-Type':'application/json',
        "Authorization":"Bearer"+" "+token
        }
    with open(str(os.getcwd()+"/HelloWorld/public/data/"+country+".txt"), 'r',encoding= 'utf-8') as f:
        param2 = json.loads(f.read())#转换成字典
        f.close()
    reference_number=country+str(random.randint(1,99999999999999))
   # print("reference_number: "+reference_number)
    param2['package']['reference_number']=reference_number
   # print(json.dumps(param2))
    response = requests.post("http://47.119.120.7:8000/pos-web/shipment/create" ,data=json.dumps(param2), headers = header)
    resp = json.loads(response.text)
    if response.status_code ==201:
       # print(json.loads(response.text))
        pass
    else:
        print(json.dumps(response.text))
        resp["ref_num"]=reference_number
        resp["data"]=param2
    return resp
