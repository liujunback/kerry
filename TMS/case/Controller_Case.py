import json
import random

import requests


from locust import HttpUser,TaskSet,task


class Test(TaskSet):#分拣机性能测试

    @task()
    def getCurrentJobInfo(self):#查货态
        with self.client.post(url = '/api/wish/getCurrentJobInfo', name = "查询当前job", catch_response = True) as response:
            if "200" in response.text:
                response.success()
            else:
                response.failure("create_failed")

    @task()
    def getJobSortingGroups(self):#查货态
        payload = json.dumps({
                            "jobId": "",
                            "offset": "",
                            "limit": 1000
                          })
        headers = {
                  'Content-Type': 'application/json'
                }
        with self.client.post(url = '/api/wish/getJobSortingGroups',headers = headers, data = payload, name = "查询job", catch_response = True) as response:
           if "200" in response.text:
                response.success()
           else:
                response.failure("create_failed")


    @task()
    def getJob(self):#查货态

        payload = {"sortingCallbackDtoList": []}
        for i in range(500):
            x={
                "tracking_id": random.randint(1,10),
                 "timestamp": "2021-04-26 15:53:30"
               }
            payload['sortingCallbackDtoList'].append(x)
        headers = {
                  'Content-Type': 'application/json'
                }
        with self.client.post(url = '/api/wish/getJob',headers = headers, data = json.dumps(payload), name = "getJob", catch_response = True) as response:
            response.text
            if "200" in response.text:
                response.success()
            else:
                response.failure("create_failed")



class websitUser(HttpUser):
    tasks = [Test]
    host = "http://47.106.39.79:53187"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒