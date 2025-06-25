import json

import openpyxl
import requests



foms_token = ""
行数 = 10

for i in range(1,行数):
    wb = openpyxl.load_workbook('../python文件/ASN_number.xlsx')#读取execl订单后入库
    ws = wb.active
    tr=str(ws['A'+str(i)].value)
asn_number = tr

# url = "https://stg-foms-api.kec-app.com/api/foms/v2/asn/cancel"
url = "https://foms-api.kec-app.com/api/foms/v2/asn/cancel"
payload={
    "warehouse_code": "KCC",
    "asn_number": asn_number
}
headers = {
  'Authorization': 'Bearer ' + foms_token
}

response = requests.request("POST", url, headers=headers, data=payload)
if json.loads(response.text)['code']== 201:
    print("取消ASN成功：" + asn_number)
    print("")
else:
    print(response.text)