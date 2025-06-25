
import json

import datetime
import random

import requests




def cancel_asn(properties,foms_token,asn_number):
    import requests
    id = select_asn_id(properties,foms_token,asn_number)
    url = properties["url"] + "/whf/cancelAsn?asnId=" + id

    payload={}
    headers = {
      'Authorization': 'Bearer ' + foms_token
    }

    response = requests.request("GET", url, headers=headers, data=payload)
    if json.loads(response.text)['code']== 200:
        print("取消ASN成功：" + asn_number)
        print("")
    else:
        print(response.text)


def select_asn_id(properties,foms_token,asn_number):
    url = properties["url"] + "/whf/getAsns?pageNumber=0&pageSize=100&sortDirection=desc&asnNumber=" + asn_number + "&companyCode=&isReturnAsn=&status="

    payload={}
    headers = {
      'Authorization': 'Bearer '+foms_token
    }

    response = requests.request("GET", url, headers=headers, data=payload)
    if json.loads(response.text)['code']== 200:
        return str(json.loads(response.text)['data'][0]["id"])
    else:
        print(response.text)



