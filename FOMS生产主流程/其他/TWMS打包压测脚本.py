import ast
import json
import os
import random

import datetime
import re

import openpyxl
import redis
import requests

from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    def on_start(self):
        url = "https://stg.hk.timeswms.com"
        username = "back.liu"
        password = "123456"

        IP = url.split("//")[1]
        res1 = requests.get(url + '/opt/login')
        c_token = re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
        payload = {
            "username": username,
            "password": password,
            "_token": c_token
        }
        # print(url)
        login = requests.post(url + '/opt/login', data=payload, cookies=res1.cookies)

        if "Logout" in login.text:
            print("登陆成功")
            XSRF_TOKEN = re.findall(r"XSRF-TOKEN=(.+?) for " + IP, str(login.cookies))[0]
            laravel_session = re.findall(r"laravel_session=(.+?) for " + IP, str(login.cookies))[0]
            csrf_token = re.findall(r"csrf-token\" content=\"(.+?)\">", str(login.text))[0]

            self.token =  {"cookies": {
                "XSRF-TOKEN": XSRF_TOKEN,
                "laravel_session": laravel_session
            },
                "_token": c_token,
                "csrf_token": csrf_token
            }

    @task()
    def create_order(self):#打包
        login = self.token

        sku_number = "TRFOMS2025101702"
        url = "/opt/pack/ajax-pack-by-order"
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-TOKEN': login['csrf_token'],
            'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session=' + login['cookies'][
                'laravel_session']
        }
        payload = {
            "wave_number": pick_wave_data["pick_wave_num"],
            "barcode": sku_number,
            "barcode_type": "default",
            "weight": 2,
            "box_type": "QT1209",
            "type": "S",
            "serial_number": "",
            "skip_weight": "no",
            "forceSkipWeight": 1
        }
        with self.client.post(url,
                        data=json.dumps(payload),  # 使用data而不是json，确保body格式正确
                        headers=headers,
                        catch_response=True,
                        name="创建出库订单") as response:
            if json.loads(response.text)['status'] == 0:
                print("打包入箱扫描成功：")
            else:
                print("打包入箱扫描失败：" + response.text)
                response.failure(f"业务失败: {response.text}")
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://stg-foms-api.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒