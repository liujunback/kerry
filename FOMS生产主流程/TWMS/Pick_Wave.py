

#波次分拣
import json
import re

import requests


def create_pick_wave(properties,login,wave_data):
    url = properties["twms_url"] + "/admin/pick_wave"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    payload={
        "_token" : login['csrf_token'],
        "centre_id" : wave_data["centre_id"],
        "client_ids" : wave_data["client_id"],
        "form_submit":""
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    # print(response.text)

    if "W0" in response.text or json.loads(response.text)['code'] == 200:
        pick_wave_id = re.findall(r"/en/admin/pick_wave/(.+?)/add-orders",str(response.text))[0]
        pick_wave_num = re.findall(r"<title>(.+?) | WMS @",str(response.text))[0]
        print("波次号：" + pick_wave_num)
        return {
            "pick_wave_id" : int(pick_wave_id),
            "pick_wave_num" : pick_wave_num,
            "client_id" : int(wave_data["client_id"]),
            "centre_id" : int(wave_data["centre_id"]),
            "order_id": int(wave_data["order_id"])
        }
    else:
        print("创建波次失败")
        print("")







def select_centre_id_OR_client_ids(properties,login,order_number):#查询客户和仓库

    url = properties["twms_url"] + "/admin/order/ajax/list?draw=3&columns%5B0%5D%5Bdata%5D=selection&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=id&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=centre_name&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=client_company_name&columns%5B3%5D%5Bname%5D=client_company_name&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=logistics_provider.name&columns%5B4%5D%5Bname%5D=logisticsProvider.name&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=logistic_provider_code&columns%5B5%5D%5Bname%5D=logistic_provider_code&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=order_number&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=" + order_number + "&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=tracking_numbers&columns%5B7%5D%5Bname%5D=tracking_numbers&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=shop_order_id&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B9%5D%5Bdata%5D=upload_at&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B10%5D%5Bdata%5D=allocate_at&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B11%5D%5Bdata%5D=wave_assign_at&columns%5B11%5D%5Bname%5D=wave_assign_at&columns%5B11%5D%5Bsearchable%5D=true&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B12%5D%5Bdata%5D=pick_wave.pick_wave_number&columns%5B12%5D%5Bname%5D=pickWave.pick_wave_number&columns%5B12%5D%5Bsearchable%5D=true&columns%5B12%5D%5Borderable%5D=true&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B13%5D%5Bdata%5D=status_text&columns%5B13%5D%5Bname%5D=orders.status&columns%5B13%5D%5Bsearchable%5D=true&columns%5B13%5D%5Borderable%5D=true&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B14%5D%5Bdata%5D=error_message&columns%5B14%5D%5Bname%5D=&columns%5B14%5D%5Bsearchable%5D=false&columns%5B14%5D%5Borderable%5D=true&columns%5B14%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B14%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B15%5D%5Bdata%5D=is_block&columns%5B15%5D%5Bname%5D=&columns%5B15%5D%5Bsearchable%5D=false&columns%5B15%5D%5Borderable%5D=false&columns%5B15%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B15%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B16%5D%5Bdata%5D=actions&columns%5B16%5D%5Bname%5D=&columns%5B16%5D%5Bsearchable%5D=false&columns%5B16%5D%5Borderable%5D=false&columns%5B16%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B16%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=1&order%5B0%5D%5Bdir%5D=desc&start=0&length=10&search%5Bvalue%5D=&search%5Bregex%5D=false&status=&_=1716195709148"

    payload={}
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }

    response = requests.request("GET", url, headers=headers, data=payload)
    if json.loads(response.text)['data']:
        wave_data = {
            "centre_id" : int(json.loads(response.text)['data'][0]["centre_id"]),
            "client_id" : int(json.loads(response.text)['data'][0]["client_id"]),
            "order_id" : int(json.loads(response.text)['data'][0]["id"])
        }
        return wave_data
    else:
        print("查询订单信息失败：" + response.text)
