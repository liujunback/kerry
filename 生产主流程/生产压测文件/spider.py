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

        with open("../../生产主流程/生产压测文件/KEC_order.txt", 'r',encoding= 'utf-8') as f:
            param2 = json.loads(f.read())#转换成字典
            f.close()
        reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(1,99999999))

        param2['package']['reference_number']=reference_number


        with self.client.get('', data = json.dumps(param2), name = "测试", catch_response = True) as response:
            if "Kerry" in response.text:
                response.success()
            else:
                response.failure("fail")
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "http://47.119.160.122:8088"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒