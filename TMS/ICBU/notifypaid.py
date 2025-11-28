import json

import requests



def notifypaid(ref_num):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/order/notifyPaid"

    payload={"notifyPaidDTO":"{\"aliOrderNo\":\""+ref_num+"\"}",
             "sign":"302c0214136652fe913b7ff360337f0e3fe1b2670e1df07302140c9aad240ff50bf1e6688dd3793c5968b76df9d5",
             "_aop_signature":"3E236486EDF3A15D7EAE77CB819CC91C41C5E802"}
    # print(json.dumps(payload))
    headers = {
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)['isSuccess'] != True:
        print(json.loads(response.text)['isSuccess'])
        print(response.text)
    print("已付费通知")
notifypaid("ALS14563495315347")