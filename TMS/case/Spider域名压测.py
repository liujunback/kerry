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
        self.token = "kecenginestgtokenh3h8hAhyJDVsMFDjMFoQ0e7niYDmOgZhoAXbS7gHipT"
        print(self.token)

    @task(1)
    def create_order(self):#下单

        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token,
            "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            'Cookie': 'visid_incap_3111118=bO8vkf4bSsaGcWKRQrSse+dZZ2kAAAAAQUIPAAAAAACz5/X83/A5c6FeV5MwyMup'
            }
        with self.client.get('/', headers = header, name = "测试", catch_response = True) as response:
            if "KEC" in response.text:
                response.success()
                # print(json.loads(response.text)["data"]["label"])
                # url = json.loads(response.text)["data"]["label"]
                # pdf = requests.get(url)
                # with open("D:\pdf\\"+reference_number+".pdf", 'wb') as f:
                #     f.write(pdf.content)
            else:
                response.failure("fail")
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://spider-stg-waf-test.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒