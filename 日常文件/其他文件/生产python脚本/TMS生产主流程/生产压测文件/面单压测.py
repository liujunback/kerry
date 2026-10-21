import ast
import json
import os
import random

import datetime
import openpyxl
import requests

from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    @task(1)
    def create_order(self):#下单
        with self.client.get('/package/87d52dca-66ab-c6f5-f655-fe5ffcb07318/label', name = "测试", catch_response = True) as response:
            response.success()
            # print(json.loads(response.text)["data"]["label"])
            reference_number = "ITTEST" + str((datetime.datetime.now()).strftime('%H%M%S'))+ str(random.randint(1,300))
            url = "http://47.119.160.122:8088/package/87d52dca-66ab-c6f5-f655-fe5ffcb07318/label"
            print("\""+reference_number+"\",")
            # url = json.loads(response.text)["data"]["label"]
            pdf = requests.get(url)
            with open("D:\pdf\\"+reference_number+".pdf", 'wb') as f:
                f.write(pdf.content)



class websitUser(HttpUser):
    tasks = [Test]
    host = "http://47.119.160.122:8088"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒