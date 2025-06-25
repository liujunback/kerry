import ast
import json
import os
import random

import re

import datetime
import urllib

import requests
import time



#oms接口------------------------------------------------------------------下单-----------------------------------------------------------------------
def order(token):
    # with open("order_data.txt", 'r') as f:#参数文件
    #     param2 = ast.literal_eval(f.read())#转换成字典
    #     reference_number="TH"+str(random.randint(100000,99999999))
    #     param2['package']['reference_number']=reference_number

    with open("../testcase/duyi.txt", 'r',encoding= 'utf-8') as f:
        param2 = json.loads(f.read())#转换成字典
        f.close()
    reference_number="TEST"+str((datetime.datetime.now()).strftime('%Y%m%d'))+str(random.randint(1,9999))
    param2['package']['reference_number']=reference_number
    token2={
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+token
            }
    #下单
    r2=requests.post("http://stg.timesoms.com/api/shipment/create",data=json.dumps(param2),headers=token2)
    print(reference_number)
    print("order："+r2.text)
    print(json.loads(r2.text)["data"]["label_url"])
    print(json.loads(r2.text)["data"]["tracking_number"])
    return json.loads(r2.text)["data"]["tracking_number"]






def create_mawb(boxid):
    res1 = requests.get('http://stg.timesoms.com/admin/login')
    c_token=re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
    login= requests.post('http://stg.timesoms.com/admin/login?username=testteam&password=test_123&_token='+c_token,cookies=res1.cookies)
    mawb_num = str(random.randint(1111,9999)) + "-" + str(random.randint(1111,9999))
    files={'_token':c_token,
            'pickup_at':(datetime.datetime.now()+datetime.timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S'),
            'mawb_number':mawb_num,
            'linehaul_forwarder':'PH-AIRBOX(S)',
            'customs_clearance_forwarder':'IMCC-Rich',
            'bind_type':'boxid',
            'bind_numbers':boxid
       }
    handover_batch=requests.post("http://stg.timesoms.com/zh/admin/cross_border/mawb_bind_boxid",data=files,cookies=login.cookies)
    print(mawb_num+handover_batch.text)
    if "seccess" in handover_batch.text:
        print("mawb:  "+mawb_num+"  "+handover_batch.text)
    return mawb_num
    #(datetime.datetime.now()+datetime.timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S')
def batch_revise(mawb):
    res1 = requests.get('http://stg.timesoms.com/admin/login')
    c_token=re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
    login= requests.post('http://stg.timesoms.com/admin/login?username=testteam&password=test_123&_token='+c_token,cookies=res1.cookies)
    flight_at={'_token':c_token,
                'operation':'batch',
                'mawb':mawb,
                'export_at':(datetime.datetime.now()+datetime.timedelta(days=1)+datetime.timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S'),
                'etd_at':(datetime.datetime.now()+datetime.timedelta(days=1)+datetime.timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S'),
                'eta_at':(datetime.datetime.now()+datetime.timedelta(days=1)+datetime.timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S'),
                'airline_name':'111',
                'airline_code':'111',
                'airport_code_origin':'222',
                'airport_code_destination':'333',
                'weight':'11',
                'mawb_gw':'1111',
                'mawb_cw':'2222',
                'flight':'3333',
                'uplift_at':(datetime.datetime.now()+datetime.timedelta(days=1)+datetime.timedelta(minutes=20)).strftime('%Y-%m-%d %H:%M:%S'),
                'ata_at':(datetime.datetime.now()+datetime.timedelta(days=1)+datetime.timedelta(minutes=25)).strftime('%Y-%m-%d %H:%M:%S'),
                'customs_on_hold_at':'',
                'import_at':(datetime.datetime.now()+datetime.timedelta(days=1)+datetime.timedelta(minutes=30)).strftime('%Y-%m-%d %H:%M:%S'),
                'handover_lastmile_at':(datetime.datetime.now()+datetime.timedelta(days=1)+datetime.timedelta(minutes=35)).strftime('%Y-%m-%d %H:%M:%S'),
               'departure_remarks':'test',
               'tracking_numbers':''
       }
    close_mawb = requests.post("http://stg.timesoms.com/zh/admin/cross_border/batch_revise" , data=flight_at ,cookies=login.cookies)
    print(close_mawb.text)

