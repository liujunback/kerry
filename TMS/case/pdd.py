import csv

# 初始化一个空列表来存储数据
data = []

# 打开文件
with open('test.txt', mode='r', encoding='utf-8') as file:
    # 创建一个csv.reader对象，指定逗号作为分隔符
    csv_reader = csv.reader(file, delimiter=',')

    # 遍历CSV文件的每一行
    for row in csv_reader:
        # 遍历当前行的每一个元素，去除前后空格
        clean_row = [value.strip() for value in row if value.strip()]
        for i in clean_row:
            data.append(i)

import json
import random

import datetime
import requests
import time


def file_create_order(token,tracking_number):
    header = {
        'Content-Type':'application/json',
        "Authorization":"Bearer"+" "+token
        }
    with open("../file_data/order_data.txt", 'r',encoding= 'utf-8') as f:
        param2 = json.loads(f.read())#转换成字典
        f.close()
    reference_number="TESTBACK"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,300))
    param2['package']['reference_number']=reference_number
    param2['package']['tracking_number']=tracking_number
    url = "http://47.119.120.7:8000/pos-web/shipment/create"

    response = requests.post(url ,data=json.dumps(param2), headers = header)
    if response.status_code ==201:
        print(response.text)
        print(json.loads(response.text)["data"]["tracking_number"])
        return json.loads(response.text)["data"]["tracking_number"]
    else:
        # print(reference_number)
        print(response.text)
        return "失败"
from TMS.public.Login import login
token = login()
from TMS.public.Inbaound import inbound
for a in data:
    inbound(a)
