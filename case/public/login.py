import json

import requests

#oms接口
def login():
	param1={'username':'back','password':'123456'}
	r1=requests.post('http://stg01.timesoms.com/api/token/get',data=param1 )
	# print("oms_token："+r1.text)
	return json.loads(r1.text)["body"]["token"]
