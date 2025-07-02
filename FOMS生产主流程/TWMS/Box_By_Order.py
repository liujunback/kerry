import json
import re

import requests


def box_by_order(properties,login,order_number,sku_number,pick_wave_data):
    url = properties["twms_url"] + "/opt/pack/ajax-pack-by-order"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    with open("../../FOMS生产主流程/data/" + properties["order_data"], 'r',encoding= 'utf-8') as f:
        payload = json.loads(f.read())#转换成字典
        f.close()
    order_item_qty =  payload["items"][0]["qty"]
    type = box_type(properties,login,pick_wave_data)
    payload={
        "order_number":order_number,
        "qty":order_item_qty,
        "barcode": sku_number +  "-1",
        "weight":"",
        "box_type":1,
        "type":type,
        "uom":"",
        "client_id":pick_wave_data["client_id"],
        "serial_number":"",
        "barcode_type":"default",
        "per_carton_qty":1,
        "packing_unit":"item"
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    if json.loads(response.text)['status'] == 0:
        print("打包入箱扫描成功：")
    else:
        print("打包入箱扫描失败：" + response.text)


def box_type(properties,login,pick_wave_data):
    url = properties["twms_url"] + "/opt/pick_wave/ajax/list?draw=2&columns%5B0%5D%5Bdata%5D=selection&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=id&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=centre.name&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=client.company_name&columns%5B3%5D%5Bname%5D=client_id&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=pick_wave_number&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=" + pick_wave_data["pick_wave_num"] + "&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=replacement.pick_wave_number&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=type&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=admin.name&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=total_orders&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B9%5D%5Bdata%5D=status&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=false&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B10%5D%5Bdata%5D=tote_set_code&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=false&columns%5B10%5D%5Borderable%5D=false&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B11%5D%5Bdata%5D=created_at&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=true&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B12%5D%5Bdata%5D=pick_list_print_at&columns%5B12%5D%5Bname%5D=&columns%5B12%5D%5Bsearchable%5D=true&columns%5B12%5D%5Borderable%5D=true&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B13%5D%5Bdata%5D=processing&columns%5B13%5D%5Bname%5D=&columns%5B13%5D%5Bsearchable%5D=false&columns%5B13%5D%5Borderable%5D=true&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B14%5D%5Bdata%5D=pick_list_print_number_of_times&columns%5B14%5D%5Bname%5D=&columns%5B14%5D%5Bsearchable%5D=false&columns%5B14%5D%5Borderable%5D=true&columns%5B14%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B14%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B15%5D%5Bdata%5D=finished_at&columns%5B15%5D%5Bname%5D=&columns%5B15%5D%5Bsearchable%5D=true&columns%5B15%5D%5Borderable%5D=true&columns%5B15%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B15%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B16%5D%5Bdata%5D=updated_at&columns%5B16%5D%5Bname%5D=&columns%5B16%5D%5Bsearchable%5D=true&columns%5B16%5D%5Borderable%5D=true&columns%5B16%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B16%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B17%5D%5Bdata%5D=actions&columns%5B17%5D%5Bname%5D=&columns%5B17%5D%5Bsearchable%5D=false&columns%5B17%5D%5Borderable%5D=false&columns%5B17%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B17%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=1&order%5B0%5D%5Bdir%5D=desc&start=0&length=10&search%5Bvalue%5D=&search%5Bregex%5D=false&status=&_=1717403975046"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-TOKEN': login['csrf_token'],
      'Cookie': 'XSRF-TOKEN=' + login['cookies']['XSRF-TOKEN'] + '; laravel_session='+login['cookies']['laravel_session']
    }
    response = requests.request("GET", url, headers=headers)

    if json.loads(response.text)['draw'] > 0:
        type = json.loads(response.text)['data'][0]["type"]
        print("波次类型查询成功：" + type)
        return type

    else:
        print("波次类型查询失败：" + response.text)