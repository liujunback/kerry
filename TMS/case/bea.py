import ast
import json
import logging

import random

import datetime
import openpyxl
import redis
import requests
import time
from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    def on_start(self):
        self.x=[]
        with open("../file_data/order_data.txt", 'r',encoding= 'utf-8') as f:
            param2 = json.loads(f.read())#转换成字典
            self.x.append(param2)
        url = "http://47.119.120.7:8000/pos-web/token/get"#测试
        payload={
                "username": "999666_KERRYCN",
                "password": "b05b41732aac4fa491723669c35f10d3"
            }
        headers = {
          'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        self.token = json.loads(response.text)['body']['token']



    @task(2)
    def create_order_TH(self):#不走末端    下单
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }
        datas = self.x[0]
        datas['package']['reference_number'] = "THBACK"+str(random.randint(1,99999999999999999))
        with self.client.post('/web/shipment/create', data = json.dumps(datas), headers = header, name = "下单", catch_response = True ) as response:
            if json.loads(response.text)["code"] == 201:
                response.success()
                print(response.text)
    @task(2)
    def create_order(self):#
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }
        datas = self.x[0]
        datas['package']['reference_number'] = "THBACK"+str(random.randint(1,99999999999999999))
        with self.client.post('/web/shipment/create', data = json.dumps(datas), headers = header, name = "下单2", catch_response = True ) as response:
            if json.loads(response.text)["code"] == 201:
                response.success()
                print(response.text)





class websitUser(HttpUser):
    tasks = [Test]
    host = "http://172.16.0.5:8001"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒


if __name__ == '__main__':
    import os
    os.system("locust -f bea.py --host='http://47.119.120.7:8000'  --web-host='127.0.0.1'")


