import ast
import json
import os
import random

import datetime
import openpyxl
import redis
import requests

from locust import HttpUser,TaskSet,task


class Test(TaskSet):



    @task()
    def create_order(self):#下单

        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" bd9d29ac-7c58-4654-bc23-a1e9ec7d5459"
            }

        reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(1,99999999))



        with self.client.get('tms-saas-web/pdd/shipment/status?tracking_number=BG-2303195ACLH9WNP5', headers = header, name = "测试", catch_response = True) as response:
            if "success" in response.text:
                response.success()
                # pool = redis.ConnectionPool(host='localhost', port=6379, db = 3)
                # r = redis.Redis(connection_pool=pool)
                # label_url = json.loads(response.text)["data"]["label_url"]
                # r.set(reference_number,label_url)
                print(json.loads(response.text))
                # with self.client.get(url=label_url,name = "laber下载", catch_response = True ) as test:
                #     if test.status_code==200:
                #         test.success()
                #     else:
                #         test.failure(test.text)
                # pdf = requests.get(label_url)
                # with open("D:\pdf\\"+reference_number+".pdf", 'wb') as f:#打开文件并且写入读取到的数据
                #     f.write(pdf.content)
                #     f.close()
            else:
                response.failure("fail")
                print(response.text)
class websitUser(HttpUser):
    tasks = [Test]
    host = "https://cb-tms-kp-de.kec-app.com/"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒