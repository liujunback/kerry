import json
import random

import openpyxl
import requests

from locust import HttpUser,TaskSet,task, constant


class Test(TaskSet):

    def on_start(self):
        #读取表格数据
        wb = openpyxl.load_workbook('../file_data/TH_data.xlsx')#TH泰国参数
        ws = wb.active
        self.data = []
        for i in range(2,2001):
             x=str(ws['A'+str(i)].value)
             self.data.append(json.loads(x))
        #登录获取token
        url = "http://47.119.120.7:8000/pos-web/token/get"
        payload={
                "username": "999666_KERRYCN",
                "password": "b05b41732aac4fa491723669c35f10d3"
            }
        headers = {
          'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        self.token = json.loads(response.text)['body']['token']
        print(self.token)

    @task(2)
    def create_order_TH(self):#下单
        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }
        #data参数
        datas = self.data[random.randint(1,100)]
        datas['sale_platform'] = ''
        datas['service']['channel_code'] = "CTCNTH099"
        datas['receiver']['country_code'] = "TH"
        datas['package']['cod_value'] ="0"
        datas['package']['payment_method'] = "PP"
        datas['receiver']['post_code'] = "24000"
        datas['package']['reference_number'] = datas['receiver']['country_code'] + "050503" + str(random.randint(1,99999999999999))
        datas['items'][0]['unit_price'] = 666
        #下单
        with self.client.post('/pos-web/shipment/create', data = json.dumps(datas), headers = header, name = "泰国下单", catch_response = True) as response:
            if "success" in response.text:
                response.success()
                # success_length = open('../request_data/success_length.txt', 'ab')
                # success_length.write(str(response.headers).encode('utf-8'))
                # success_length.close()
            else:
                response.failure(response.text)
                # failder_response = open('../request_data/failed_response.txt', 'ab')
                # failder_response.write(str(response.text).encode('utf-8'))
                # failder_response.close()
                # datas = json.dumps(datas)
                # failder_data = open('../request_data/failed_data.txt', 'ab')
                # failder_data.write(str(datas+"\n").encode('utf-8'))
                # failder_data.close()





class websitUser(HttpUser):
    tasks = [Test]
    host = "http://47.119.120.7:8000"
    wait_time = constant(5)
