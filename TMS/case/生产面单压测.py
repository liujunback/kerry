import json
import random

import openpyxl
import requests
from locust import HttpUser,TaskSet,task


class Test(TaskSet):#偏远费

    @task(2)
    def Free_TH(self):#偏远费    下单
        headers = {
                          'Authorization': 'Bearer 597bf9cc-6929-41a3-a6d1-2fd3b49793e5'
                    }
        with self.client.get('/pos-web//shipment/label?label_type=FM&pdd_mode=true&reference_number=BG-23031200USPGXZ0W',headers=headers ,name = "偏远费TH", catch_response = True) as response:
            if json.loads(response.text)["code"] == 200:
                response.success()
            else:
                response.failure("fail")
                print(response.text)


class websitUser(HttpUser):
    tasks = [Test]
    host = "https://pos-kec.kerry-ecommerce.com.cn"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒
