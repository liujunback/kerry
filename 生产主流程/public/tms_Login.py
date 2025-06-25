import json

import requests


def tms_login(properties):
    try:
        url = properties['tms_url']
        url = url + "/tms-saas-web/user/login?userNo=" + properties['tms_login_name'] + "&password=" + properties[
            "tms_login_password"] + "&companyNo=&domain="
        response = requests.post(url=url, verify=False)
        # print(response.text)
        return json.loads(response.text)["body"]["token"]
    except json.decoder.JSONDecodeError:
        print("系统正在升级")
