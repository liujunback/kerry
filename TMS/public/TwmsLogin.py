import random
import re

import datetime
import requests



def  Twms_inbound(inbon):
    res1 = requests.get('http://stg.timeswms.com/admin/login')
    c_token=re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
    login= requests.post('http://stg.timeswms.com/admin/login?username=root&password=123456&_token='+c_token,cookies=res1.cookies)
    datas = {
        '_token':c_token,
            "action": "inbound",
            "tracking_number":inbon,
            "client_id":"999666"
        }
    test= requests.post("http://stg.timeswms.com/admin/inbound/ajax",cookies=login.cookies,data=datas)
def Twms_put(inbon):
    res1 = requests.get('http://stg.timeswms.com/admin/login')
    c_token=re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
    login= requests.post('http://stg.timeswms.com/admin/login?username=root&password=123456&_token='+c_token,cookies=res1.cookies)
    palay = {
        '_token':c_token,
            "action":"put-away",
            "bin_code": "XMI06",
            "tracking_number": inbon
    }
    response = requests.post("http://stg.timeswms.com/admin/put-away/ajax",cookies=login.cookies,data=palay)
    print(response.text)
#
# Twms_inbound("KECTH91161350")
# Twms_put("KECTH91161350")



