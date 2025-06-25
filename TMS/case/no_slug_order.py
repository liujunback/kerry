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
        #读取表格数据
        wb = openpyxl.load_workbook('../file_data/MY_ABX.xlsx')#TH泰国参数
        ws = wb.active
        self.data = []
        for i in range(2,70):
             x=str(ws['A'+str(i)].value)
             self.data.append(json.loads(x))
        #登录获取token
        #url = "http://47.119.120.7:8000/pos-web/token/get"
        url = "http://120.78.66.231:8000/pos-web/token/get"
        payload={
            "username":"51002_KERRYCN",
            "password": "8a765f2795ac48af8b5955718a46d0a1"
        }
        headers = {
          'Content-Type': 'application/json'
        }

        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        self.token = json.loads(response.text)['body']['token']

        pool = redis.ConnectionPool(host='localhost', port=6379, db = 1)
        self.r = redis.Redis(connection_pool=pool)
        print(self.token)

    @task(2)
    def create_order_TH(self):#不走末端    下单
        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }

        #data参数
        datas = self.data[random.randint(0,49)]
        datas['sale_platform'] = ''
        datas['service']['channel_code'] = "CACNMY001"
        datas['receiver']['country_code'] = "MY"
        reference_number = datas['receiver']['country_code'] + "0518001" + str(random.randint(100,99999999999999))
        datas['package']['reference_number'] = reference_number
        #下单
        start = time.time()
        with self.client.post('/pos-web/shipment/create', data = json.dumps(datas), headers = header, name = "泰国下单", catch_response = True ) as response:
        #with self.client.post('/web/shipment/create', data = json.dumps(datas), headers = header, name = "泰国下单", catch_response = True ) as response:
            #print(json.dumps(datas))
            if reference_number in response.text:
                response.success()
                label_url = json.loads(response.text)["data"]["label_url"]
                self.r.set(reference_number,label_url)
                # with self.client.get(url=label_url,name = "laber下载", catch_response = True ) as test:
                #     if test.status_code==200:
                #         test.success()
                #     else:
                #         test.failure(test.text)
                # pdf = requests.get(label_url)
                end = time.time()
                # with open("D:\pdf\\"+reference_number+".pdf", 'wb') as f:#打开文件并且写入读取到的数据
                #     f.write(pdf.content)
                #     f.close()
                success_length = open('../request_data/success_length.txt', 'ab')
                #success_length.write(str(str(datas['package']['reference_number'])+"   "+ str(end - start) + "    " +str(datetime.datetime.now())+"\n").encode('utf-8'))
                success_length.write(str(label_url+"\n").encode('utf-8'))
                success_length.close()
            else:
                response.failure(response.text)
                failder_response = open('../request_data/failed_response.txt', 'ab')
                failder_response.write(str(response.text).encode('utf-8'))
                failder_response.close()
                datas = json.dumps(datas)
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(datas+"\n").encode('utf-8'))
                failder_data.close()




class websitUser(HttpUser):

    tasks = [Test]
    #host = "http://172.16.0.52:8001"
    host = "http://120.78.66.231:22900"
    #host= "http://120.78.66.231:8000"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒


if __name__ == '__main__':
    import os
    os.system("locust -f no_slug_order.py --host=http://120.78.66.231:22900")


