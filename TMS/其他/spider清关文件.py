import openpyxl
import requests
import json

url = "http://120.24.31.239:20000/tms-saas-web/manifest-receive-file"


wb = openpyxl.load_workbook('../../TMS/其他/运单管理.xlsx')#读取execl订单后入库
ws = wb.active
for i in range(1,65393):
    tr=str(ws['A'+str(i+40000)].value)

    payload = json.dumps({
      "tracking_number": tr,
      "file_url": "http://stg.spider.tec-api.com:38005/package/download_file/pasarex_declaration?file_name=KP_KPKRCOPAX000000080"
    })
    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    if json.loads(response.text)["code"] ==200:
        print(tr)
    else:
        # print(reference_number)
        print(tr + ":" + response.text)

