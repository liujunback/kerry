import ast
import json
import os
import random

import openpyxl
import requests

from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    def on_start(self):
        #登录获取token
        url = "http://47.119.120.7:8000/pos-web/token/get"
        payload={
                "username": "999666_KERRYCN",
                "password": "b05b41732aac4fa491723669c35f10d3"
            }
        headers = {
          'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        self.token = json.loads(response.text)['body']['token']
        print(self.token)

    @task(2)
    def create_order_TH(self):#下单
        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }
        datas =open("../file_data/order_data.txt", encoding="UTF-8").read()
        param2 = ast.literal_eval(datas)#转换成字典
        reference_number="TH232"+str(random.randint(1,99999999999999))
        param2['package']['reference_number']=reference_number
        with self.client.post('/pos-web/shipment/create', data = json.dumps(param2), headers = header, name = "测试", catch_response = True) as response:
            if "success" in response.text:
                response.success()
                success_length = open('../request_data/success_length.txt', 'ab')
                success_length.write(str(response.text).encode('utf-8'))
                success_length.close()
            else:
                response.failure("fail")
                failder_response = open('../request_data/failed_response.txt', 'ab')
                failder_response.write(str(response.text).encode('utf-8'))
                failder_response.close()
                datas = datas
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(datas+"\n").encode('utf-8'))
                failder_data.close()



class websitUser(HttpUser):
    tasks = [Test]
    host = "http://47.119.120.7:8000"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒