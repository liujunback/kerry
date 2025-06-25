import json
import random

import requests

url = "http://120.24.31.239:20000/tms-saas-web/Order.aspx"
# url = "https://tms-kec.kerry-ecommerce.com.cn/tms-saas-web/Order.aspx"

def shopee():
    datas = execl_data()
    for i in range(50,100):
        content =datas[i]
        payload={
            "content":content,
            "service":"tms_order_notify",
            "sign":"43933db"

        }

        headers = {
          'Content-Type': 'application/x-www-form-urlencoded'
        }

        response = requests.request("POST", url, headers=headers, data=payload)
        if "jobno" not in response.text:
            print(content)
        print(response.text)


def execl_data():
    datas = []
    file = open("订单接收2021-10-14_log(1).txt")
    while 1:
        line = file.readline()
        if "request" in line:
            datas.append(line)
        if not line:
            break
        pass # do something
    file.close()
    return list(dict.fromkeys(datas))


shopee()