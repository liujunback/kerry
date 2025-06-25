import json
import urllib

import requests



def icbu_return(ref_num):

    url = "http://120.24.31.239:20000/tms-saas-web/order/return"

    payload = {
        "returnDTO":{
                    "aliOrderNo":ref_num,
                    "reasonCode":"200010",
                    "reasonName":"Back_test",
                    "returnType":"REFUND",
                    "remark":"",
            "contact":{"city":"深圳市","countryCode":"China","mobile":"13530450773","name1":"韩华婷","postalCode":"518031","stateRegionCode":"广东省","street1":"福田区 华富街道 航都大厦15楼富斯特威有限公司"}
                },
        "sign":"302c021468098d5f5edce64fb64a5a0c67d137f6ee9da1b402142e65b0d85001be5512be84b68e6b9fc00fb6a95e"
    }

    headers = {
          'Content-Type': 'application/json'
        }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)['isSuccess'] != True:
        print(response.text)
