import json
import random
import urllib
from _md5 import md5

import openpyxl
import requests
from itsdangerous import base64_encode

from TMS.ICBU.status import status

import datetime
def open_excel():#读取ececl数据
    wb = openpyxl.load_workbook('cainiao_cex_draft_orders.xlsx')#TH泰国参数
    ws = wb.active
    data = []
    for i in range(3,4):
         x=json.loads(str(ws['D'+str(i)].value))
         tracking_number =  "621000000000" + str(random.randint(100000000000000,900000000000000))
         x["trackingNumber"] = tracking_number
         logisticsOrderCode = "LP20210" + str((datetime.datetime.now()).strftime('%m%d%H%M%S'))
         x["logisticsOrderCode"] = logisticsOrderCode
         print(logisticsOrderCode)
         data.append(x)

    return data




def create():
    dataList = open_excel()
    for i in range(0,len(dataList)):
        url = "http://120.24.31.239:20000/tms-saas-web/kparcel/cainiao/order?channel_code=CACNPTKPE"
        # url = "http://120.79.131.69:20000/tms-saas-web/kparcel/cainiao/order?channel_code=CACNPTKPE"#Kparcel生产环境
        payload={'data_digest': 'fOzYH+3L0d7LZya9mURGsQ==',
        'msg_type': '12',
        'logistics_interface': dataList[i],
        'partner_code': '123',
        'from_code': '123',
        'msg_id': '123'}
        files=[
        ]
        headers = {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
        # print(json.dumps(payload))
        response = requests.request("POST", url, headers=headers, data=urllib.parse.urlencode(payload), files=files)
        print(response.text)
        return dataList[i]["logisticsOrderCode"]
