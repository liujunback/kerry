import json
import os
import random
import urllib

import openpyxl
import requests

def open_excel():#读取ececl数据
    wb = openpyxl.load_workbook(str(os.getcwd()+"/HelloWorld/public/cainiao/cainiao_order.xlsx"))
    ws = wb.active
    data = []
    for i in range(999,1000):
         x=json.loads(str(ws['D'+str(i)].value))
         tracking_number =  "621000000000" + str(random.randint(100000000000000,900000000000000))
         x["trackingNumber"] = tracking_number
         logisticsOrderCode = "LP002021" + str(random.randint(100000,900000))
         x["logisticsOrderCode"] = logisticsOrderCode
         print(logisticsOrderCode)
         data.append(x)

    return data




def CaiNiao_create():
    dataList = open_excel()
    for i in range(0,len(dataList)):
        url = "http://120.24.31.239:20000/tms-saas-web/kparcel/cainiao/order?channel_code=CACNPTKPE"
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
        response = requests.request("POST", url, headers=headers, data=urllib.parse.urlencode(payload), files=files)
        return "参考编号："+dataList[i]["logisticsOrderCode"]+"\n"+response.text
