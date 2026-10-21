import json
import random

import datetime

import openpyxl
import requests
import time


def spider(tracking_number,status_code):
    import requests
    import json

    url = "https://spider-stg.kec-app.com/package/tracking/kerryth"

    payload = json.dumps({
      "req": {
        "status": {
          "status_date": str((datetime.datetime.now()).strftime('%Y-%m-%d %H:%M:%S')),

          "timezone": "+01:00",
          "status_code": status_code,
          "status_desc": "test",
          "location": "",
          "con_no": tracking_number
        }
      }
    })
    headers = {
      'Authorization': 'Bearer test123token',
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload,  # 设置超时时间
            verify=False,  # 如果SSL证书有问题，可以暂时关闭验证
            proxies={"http": None, "https": None} )

    print(response.text)


# wb = openpyxl.load_workbook('../public/运单管理 (11).xlsx')
# ws = wb.active
#
# # 获取A列所有单元格的值（从第一行开始，直到有数据的最后一行）
# for cell in ws['A']:
#     tracking_number = str(cell.value) if cell.value is not None else ''
#     if tracking_number:  # 如果有值
#         spider(tracking_number, "010")
#         spider(tracking_number, "600")