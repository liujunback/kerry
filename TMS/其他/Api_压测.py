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
        url ="https://pos-kec-eng-uat.kec-app.com/"
        username = "999666_KERRYCN"
        password = "b05b41732aac4fa491723669c35f10d3"

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
        """小包创建订单"""
        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }
        param2 = {
                  "extra_info": {
                    "additional_services": "sigsss",
                    "shopname": "aaa"
                  },
                  "items": [
                    {

                      "currency": "THB",
                      "description": "gifs",
                      "description_origin_language": "礼物",
                      "hs_code": "2534564646",
                      "measure_unit": "个",
                      "origin_of_cnex_code": "10025",
                      "quantity": 1,
                      "sku": "12132423432543512132423432543512",
                      "spec": "1|2|NuPhy|Kick75卡带灰超红nano键盘-IO|无线111",
                      "unit_price": 25,
                      "unit_weight": 45.64647
                    }
                  ],
                  "package": {
                    "actual_weight": 99,
                    "declared_value": 25,
                    "declared_value_currency": "THB",
                    "height": "77",
                    "incidental_fee": 0,
                    "incidental_fee_currency": "USD",
                    "length": "67",
                    "number_of_package": 3,
                    "package_type": "WPX",
                    "payment_method": "PP",
                    "pickup_tn": "",
                    "reason_for_export": "",
                    "reference_number": "TESTBACK20260929164025642107",
                    "shipment_term": "DDP",
                    "shipment_type": "General",
                    "shipping_fee": 0,
                    "shipping_fee_currency": "USD",
                    "sort_code": "",
                    "tracking_number": "",
                    "width": "56"
                  },
                  "receiver": {
                    "address": "test etst test testsssqqqqqq2",
                    "city": "Hampton",
                    "company": "KEC-TH",
                    "country_code": "TH",
                    "district": "Phuong 19",
                    "email": "1113245dfgdf@163.com",
                    "id_card_number": "000",
                    "id_card_number_type": "id_card",
                    "id_number": "35345754511",
                    "id_number_type": "",
                    "location_code": "RAGI2929",
                    "name": "KECTH",
                    "phone": "123456789",
                    "post_code": "21000",
                    "province": "Victoria"
                  },
                  "sale_platform": "AAAA",
                  "sender": {
                    "address": "humen",
                    "city": "dongguan dongguan dongguan",
                    "company": "11LS",
                    "country_code": "CN",
                    "district": "",
                    "email": "3245dfgdf@163.com",
                    "id_number": "11154511222",
                    "id_number_type": "",
                    "name": "mMMM",
                    "phone": "00000000000",
                    "province": "GLS"
                  },
                  "service": {
                    "channel_code": "backtest",
                    "delivery_instruction": "",
                    "pickup_at": "",
                    "pickup_cutoff_at": "",
                    "service_type": "QQA"
                  }
                }
        reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(1,99999999))

        param2['package']['reference_number']=reference_number
        param2['package']['tracking_number']=reference_number+"01"


        with self.client.post('/pos-web/shipment/create', data = json.dumps(param2), headers = header, name = "创建订单", catch_response = True) as response:
            if "success" in response.text:
                response.success()
                print(reference_number)
                # pool = redis.ConnectionPool(host='localhost', port=6379, db = 3)
                # r = redis.Redis(connection_pool=pool)
                # label_url = json.loads(response.text)["data"]["label_url"]
                # r.set(reference_number,label_url)
                # print(json.loads(response.text))
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

    @task()
    def create_order1(self):  # 下单
        """包裹查询轨迹"""
        # 定义请求头
        header = {
                  'Authorization': 'Bearer 00a7da1c-286a-4c9b-bc61-e8bf8aabc2bb'
                }

        with self.client.get('/pos-web/shipment/status?tracking_number=KECTH92006086', headers=header, name="包裹查询轨迹",
                              catch_response=True) as response:
            if "200" in response.text:
                response.success()



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://pos-kec-eng-uat.kec-app.com/"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒