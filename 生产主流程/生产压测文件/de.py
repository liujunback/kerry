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

        payload = ''
        headers = {
          'Authorization': 'Bearer 749fbaa5-3fd4-4f3a-b04c-46ba400c1756'
        }
        with self.client.get("/tms-saas-web/radiance/shipment/status?tracking_number=KPBOG000124539", name = "测试",headers = headers, catch_response = True) as response:
            if "200" in response.text:
                response.success()
            else:
                print(response.text)
            # print(json.loads(response.text)["data"]["label"])
            reference_number = "ITTEST" + str((datetime.datetime.now()).strftime('%H%M%S'))+ str(random.randint(1,300))

            # url = "https://spider.kec-app.com//package/87d52dca-66ab-c6f5-f655-fe5ffcb07318/label"
            # print("\""+reference_number+"\",")
            # # url = json.loads(response.text)["data"]["label"]
            # pdf = requests.get(url)
            # with open("D:\pdf\\"+reference_number+".pdf", 'wb') as f:
            #     f.write(pdf.content)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://cb-tms-kp-de.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒