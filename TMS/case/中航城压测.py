import ast
import json
import os
import random

import datetime
import openpyxl
import requests

from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    def on_start(self):
        url ="http://47.119.120.7:8000/"
        username = "999666_KERRYCN"
        password = "b05b41732aac4fa491723669c35f10d3"
        url = url +"pos-web/token/get"
        payload={
                    "username": username,
                    "password": password
                }
        headers = {
          'Content-Type': 'application/json'
        }
        response = requests.post( url, headers=headers, data=json.dumps(payload),verify=False,timeout=20)
        self.token = json.loads(response.text)['body']['token']
        print(self.token)

    @task()
    def create_order(self):#下单

        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }

        with open("../../TMS/case/KEC_order.txt", 'r',encoding= 'utf-8') as f:
            param2 = json.loads(f.read())#转换成字典
            f.close()
        reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,300))

        param2['package']['reference_number']=reference_number

        with self.client.post('/pos-web/shipment/create', data = json.dumps(param2), headers = header, name = "测试", catch_response = True) as response:
            if "success" in response.text:
                response.success()
                print(json.loads(response.text)["data"]["tracking_number"])
            else:
                response.failure(response.text)
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "http://47.119.120.7:8000/"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒