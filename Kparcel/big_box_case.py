
# for a in range(1):
import json
import random

import time

import requests

test = "http://120.79.147.221:8001"
# test = "http://47.119.120.7:8000"


def date(pakege_list):
    date={"bag_id":"123121321","bag_weight":151,"bag_length":52,"bag_width":55,"bag_height":45}
    date["bag_id"]="TEST"+str(random.randint(1000,999999))
    x=[]
    for i in range(pakege_list):
        a={
              "service": {
                "channel_code": "CACNESMCR"
              },
              "package": {
                "reference_number": "XS210501276033419",
                "declared_value": 3.0,
                "declared_value_currency": "USD",
                "actual_weight": 54,
                "shipment_term": "DDU",
                "payment_method": "PP"
              },
              "sender": {
                "name": "fangqingyi",
                "company": "fangqingyi",
                "address": "changan zhen shatou",
                "city": "guangdong",
                "province": "donggua",
                "country_code": "CN",
                "post_code": "523000",
                "phone": "13166668888",
                "email": "jiachuang@166.com"
              },
              "receiver": {
                "name": "Mary Ann Nathan",
                "company": "",
                "address": "42-44 Jalan Limau Nipis, Bangsar Park",
                "district": "",
                "city": "Kuala Lumpur",
                "province": "Kuala Lumpur",
                "country_code": "ES",
                "post_code": "08041",
                "phone": " 60450361331",
                "email": "claudia_a92@hotmail.co.uk",
                "id_number": ""
              },
              "items": [
                {
                  "sku": "YCWLWL485542608",
                  "description": "Style",
                  "description_origin_language": "金箔纸",
                  "unit_price": 3.0,
                  "currency": "USD",
                  "quantity": 1,
                  "hs_code": "3212100000"
                }
              ]
            }

        a["package"]["reference_number"]=random.randint(1,10000000)
        x.append(a)
        x[i]["package"]["reference_number"]="TEST"+str(random.randint(1,10000000))+str(i)
    date["package_list"]=x
    return date

def login():

    url = test+"/pos-web/token/get"

    payload={"username":"700231_K-PARCEL",
             "password": "9a7ef7737c48465da3d5c8382b221606"}

    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    return json.loads(response.text)['body']['token']

def create_big_box_id(pakege_list):
    start =time.clock()
    token=login()
    header={"Content-Type":"application/json","Authorization":"Bearer "+token}
    r1=requests.post(test+"/pos-web/shipment/create/multiple",data=json.dumps(date(pakege_list)),headers=header)
    end = time.clock()
    print('Running time: %s Seconds'%(end-start))
    print(r1.text)

