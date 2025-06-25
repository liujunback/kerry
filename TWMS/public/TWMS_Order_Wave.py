import json
import random
from time import sleep
from urllib import parse

import re
import requests

def  Twms_Order_Wave(login_data,wave_data,order_ids):

    headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }
    url = wave_data['wave_url']

    payload='_token=' + login_data['csrf_token'] + '&client_ids%5B%5D=68&logistics_provider_id=&order_number=&ordertype=&consignee_country=&consignee_city=&order_date=&created_at=&etd_at=&order_items_greater=&order_items_less=&is_contain_temperature_control_items=&is_partial_allocate_stock=0&sku_tag=&number_of_available_tote=&is_validation_cbm=0&pick_remark=&requested_delivery_date=&sku_code=&sku_barcode=&postcode_zone=&print_type=print&ids%5B%5D=' + wave_data['wave_id'] + '&dataTables_length=10&add_order_ids%5B%5D=' + order_ids + '&action=assign'

    response = requests.request("POST", url, headers=headers, data=payload)
    if wave_data['wave_pack'] in response.text:
        print("波次确认成功")









