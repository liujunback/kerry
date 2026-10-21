import requests
import json

def Ops_Login():
    data={
        "userNo":"HM",
        "password":"123465"
    }
    header={
        'Content-Type': 'application/json'
    }
    response =  requests.post("http://59.36.186.173:22000/controller/account/tms/login",data=json.dumps(data),headers=header)
    #print(response.text)
    return json.loads(response.text)["data"]["token"]
