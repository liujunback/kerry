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
        self.token = "9753767e05d847e6959a6f8c1cbbdc78"
        self.key = "6e4b65df-fa27-4e8f-8095-deb12e553cc5"
        self.version="1.0"
        print(self.token)

    @task()
    def create_order(self):#下单

        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "token":self.token,
            "key":self.key,
            "version":self.version
            }

        with open("../../TMS/case/KEC_order.txt", 'r',encoding= 'utf-8') as f:
            param2 = json.loads(f.read())#转换成字典
            f.close()
        reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,300))

        param2['customerRefNo'] = reference_number

        with self.client.post('/api/Waybill', data = json.dumps(param2), headers = header, name = "测试", catch_response = True) as response:
            if json.loads(response.text)["responseCode"] == 0:
                response.success()
            else:
                response.failure("fail")
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "http://api.cacc-log.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒