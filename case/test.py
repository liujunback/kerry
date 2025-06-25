import requests

url = "http://120.24.31.239:20000/tms-saas-web/tms/bagging/list?code=KENLNT00184399&codeType=1&dfDatetime=&baggingStatId=&deliStatId=&baggingState=&dataMode=&currentStatId=1&baggingStrategyId=&pageSize=50&currentPage=0&token=6b596471-4979-4db1-83e2-4e25640089dd"

payload={}

response = requests.request("GET", url, data=payload)

print(response.text)
