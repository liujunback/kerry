import openpyxl
import requests

for i in range(1,235):
    wb = openpyxl.load_workbook('../kerry/test.xlsx')#读取execl订单后入库
    ws = wb.active
    tr=str(ws['A'+str(i)].value)
    url = "http://47.106.35.123:8088/package/"
    url = url + tr
    payload={}

    headers = {
      'Authorization': 'Bearer Qrc1KwqsadCBKZNM8JZrHu1wPZn0OhZ8Q1LYr6PM9c6LmRqWfKTxYtEOjsYi',
      'Content-Type': 'application/json'
    }
    response = requests.request("DELETE", url, headers=headers, data=payload)
    print(response.text)
