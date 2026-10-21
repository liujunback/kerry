import json
import requests
import urllib3
from TMS.public.Controller_Login import Controller_Login

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def check_weight(box_num,tracking_list=3):

    url = "https://ops-eng-uat.kec-app.com/controller/operations/outbound/checkWeight"
    token = Controller_Login()
    payload={
            "boxTypeCode":"back",
            "boxNumber":box_num,
            "weighingWeight":str(8112),
            "length":450,
            "width":550,
            "height":500,
            "weight":1612
        }
    headers = {
      'token': token,
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload), verify=False, proxies={"http": None, "https": None})
    if json.loads(response.text)["code"] == 200:
        print(json.loads(response.text)["msg"])
    else:
        print(response.text)