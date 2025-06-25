import requests
import json

def Controller_Login():
    data={
        "userNo":"kec064",
        "password":"123465"
    }
    header={
        'Content-Type': 'application/json'
    }
    response =  requests.post("http://47.107.105.241:22000/controller/account/tms/login",data=json.dumps(data),headers=header)
    if json.loads(response.text)["code"] == 200:
        return json.loads(response.text)["data"]["token"]
    else:
        print(response.text)