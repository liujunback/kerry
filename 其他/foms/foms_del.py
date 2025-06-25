import json

import openpyxl
import requests


删除多少行 = 3
for i in range(1,删除多少行):

    token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjYxMywidXNlck5hbWUiOiJpdnN0ZXN0LmJsdmNrIiwiaWF0IjoxNzA1NjUxNzgyLCJleHAiOjE3MDU3MzgxODJ9._TCWd6we1-Vi4mk3VVB3WEzJnTlQqBX8m2cCaC2kWeI"

    wb = openpyxl.load_workbook('../foms/foms.xlsx')#读取execl订单后入库
    ws = wb.active
    tr=str(ws['A'+str(i)].value)

    url = "https://foms-api.kec-app.com/api/foms/v2/order/delete"

    payload={
            "order_number": tr
        }
    headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["code"] == 202:
        print("成功")
    else:
        print("失败:" +tr +response.text)
