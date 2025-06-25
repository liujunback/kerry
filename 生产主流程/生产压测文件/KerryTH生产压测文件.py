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
        self.token = "e0J7AjwuDEsNb2sJxTgEZq4cQPXvlyMyL7v8nk4m3vfmgrJk1KKuDl91zfKr"
        print(self.token)

    @task(1)
    def create_order(self):#下单

        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }
        with open("../../生产主流程/生产压测文件/kerry.txt", 'r',encoding= 'utf-8') as f:
            param2 = json.loads(f.read())#转换成字典
            f.close()
        reference_number = "ITTEST" + str((datetime.datetime.now()).strftime('%H%M%S'))+ str(random.randint(1,300))
        param2['package']['shipper_reference_id'] = reference_number
        param2['package']['order_number'] = reference_number
        with self.client.post('/package/booking', data = json.dumps(param2), headers = header, name = "测试", catch_response = True) as response:
            if "success" in response.text:
                response.success()
                # print(json.loads(response.text)["data"]["label"])
                print("\""+reference_number+"\",")
                url = json.loads(response.text)["data"]["label"]
                # pdf = requests.get(url)可以
                # with open("D:\pdf\\"+reference_number+".pdf", 'wb') as f:
                #     f.write(pdf.content)
            else:
                response.failure("fail")
                print(reference_number)
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://spider.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒