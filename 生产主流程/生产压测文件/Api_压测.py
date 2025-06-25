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

    def on_start(self):
        url ="https://cb-pos-kp-de.kec-app.com/"
        username = "999666_K-PARCEL"
        password = "e10adc3949ba59abbe56e057f20f883e"

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
        print(response.text)


        print(self.token)

    @task()
    def create_order(self):#下单

        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }
        with open("../../生产主流程/生产压测文件/KEC_order.txt", 'r',encoding= 'utf-8') as f:
            param2 = json.loads(f.read())#转换成字典
            f.close()
        reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(1,99999999))

        param2['package']['reference_number']=reference_number
        param2['package']['tracking_number']=reference_number+"01"


        with self.client.post('/pos-web/shipment/create', data = json.dumps(param2), headers = header, name = "测试", catch_response = True) as response:
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
    host = "https://cb-pos-kp-de.kec-app.com/"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒