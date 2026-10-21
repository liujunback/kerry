import json

import openpyxl
import requests





for i in range(350,360):
    wb = openpyxl.load_workbook('../其他/FULFILLMENT_ORDER (23).xlsx')#读取execl
    ws = wb.active
    tr=str(ws['A'+str(i)].value)
    id= tr
    url = "https://foms-api.kec-app.com/whf/cancelOrder?orderId=" + id
    print(url)
    payload={}
    headers = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjMyMCwidXNlck5hbWUiOiI5OTk2NjYua2VjIiwiaWF0IjoxNzE0MTI4NTk0LCJleHAiOjE3MTQ3MzMzOTR9.3jMMgPl_ppzW-HTKox9MxDTEUESJ1yXLp11NTsOy5lw'
    }

    response = requests.request("GET", url, headers=headers, data=payload)
    if json.loads(response.text)["code"] !=200:
        print(response.text)
