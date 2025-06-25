import json

import datetime
import random

import requests



def bag_creat(order_list):
    url = "http://120.24.31.239:20000/tms-saas-web/wish/bag/create"
    # url = "http://120.79.131.69:20000/tms-saas-web/wish/bag/create"#Kparcel生产环境测试地址
    box_num = "WISH0729"+str((datetime.datetime.now()).strftime('%Y%m%d%H%M'))
    # box_num = "WISH0729202108311805"
    payload={
    "notify_category":1,
    "api_key":"r7ozJZmjvQHONMQZ9FIdCgjOxL02lWkaC55AGEQdJnPdlAqYhXbWRhPM6VUA",
    "bags":[
                {
                    "cancel_time":None,
                    "upstream_code":1038,
                    "ref_bag_number":box_num,
                    "timestamp":"2022-05-29 07:33:27",
                    "handover_serial_number":None,
                    "created_time":"2022-05-29 07:33:27",
                    "handover_ack_time":None,
                    "message":None,
                    "state_code":0,
                    "declared_weight":0.189,
                    "state_name":"创建成功",
                    "actual_weight":None,
                    "downstream_name":"嘉里电商供应链方案(深圳)有限公司",
                    "bag_number":box_num,
                    "downstream_code":85,
                    "bag_type":3,
                    "handover_time":None,
                    "upstream_name":"华南EPC 16仓",
                    "orders":order_list,
                    "channel_name":"Wishpost - 嘉邮通 - 平邮(仅支持线上结算)",
                    "pickup":{
                        "company":"",
                        "zipcode":"523516",
                        "address_local":{
                            "province":"广东省",
                            "city":"东莞市",
                            "name":"吕桂友",
                            "district":"",
                            "country":"中国",
                            "street_address2":"",
                            "street_address1":"东莞市黄江镇田星路39号巨卓科技园2楼"
                        },
                        "phone":"15089885570",
                        "country_code":"CHN",
                        "address_en":{
                            "province":"Guangdong",
                            "city":"Dongguan",
                            "name":"Lv Guiyou",
                            "district":"",
                            "country":"China",
                            "street_address2":"",
                            "street_address1":"Dongguanshihuangjiangzhentianxinglu39haojuzhuokejiyuan2lou"
                        },
                        "email":""
                    },
                    "handover_eta":"2022-05-31 07:33:27"
                }
            ]
        }
    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

    print(response.text)
    return box_num

