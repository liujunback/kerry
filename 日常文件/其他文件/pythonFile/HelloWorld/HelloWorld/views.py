import random
import re

import datetime
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
import json
import requests




@csrf_exempt
def hello(request):
    name = request.body.decode()
    #print(str(name))
    try:
        pro = request.POST['notifyBizEventDTO']
        print(pro)
    except Exception as e:
        print(name)
    import os
    path = os.getcwd()#获取当前路径
    open(path+"\HelloWorld\logs\log.log",'ab').write(str(name+"\n").encode('utf-8'))
    result = {"success":"true","message":"successfully.","code":0,"errorCode":"","errorMsg":""}
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def create(request):
    ctx={}
    if request.POST:
        from HelloWorld.public.login import login
        token=login()
        print(token)
        ctx["rt"] = token
    return render(request, "create.html", ctx)

@csrf_exempt
def search_post(request):

    from testdave.HelloWorld.public.login import login
    from testdave.HelloWorld.public.create import create_order
    from testdave.HelloWorld.public.inbound import inbound
    from testdave.HelloWorld.public.outbound import outbound
    from testdave.HelloWorld.public.close_box import close_box
    from testdave.HelloWorld.public.check_weight import check_weight
    from testdave.HelloWorld.public.shipment_add import shipment_add
    from testdave.HelloWorld.public.shipment_close import shipment_close
    from testdave.HelloWorld.public.shipment_num_scan import shipment_scan
    from testdave.HelloWorld.public.bag_create import date

    ctx ={}
    if request.POST:
        x  = int(request.POST['q'])
        country = request.POST['w']
        big = request.POST['a']
        token=login()
        tra_num_list = []

        if x>=1:
            if big =="big":
                data = date(2,country)
                ctx['tracking_number'] = data

            else:
                response = create_order(token,country)
                tracking_number = response["data"]["tracking_number"]
                tra_num_list.append(tracking_number)
                ctx['tracking_number'] = tracking_number
                ctx['rlt'] = json.dumps(response)

            if x>=2:
                import time
                time.sleep(20)
                inbound_text = inbound(tracking_number)
                ctx['inbound'] = inbound_text
                
                if x>=3:
                    outbound_text = outbound(tracking_number)
                    box_num = outbound_text['出库成功:箱号']
                    ctx['outbound'] = outbound_text

                    if x>=4:
                        close_box_text = close_box(box_num,tra_num_list)
                        check_weight(box_num,tra_num_list)
                        ctx['close_box'] = close_box_text

                        if x>=4:
                            time.sleep(15)
                            shipment_num = shipment_add()
                            shipment_num_ids = shipment_scan(box_num,shipment_num)
                            shipment_close_text = shipment_close(shipment_num_ids,shipment_num)
                            ctx['shipment_close'] = shipment_close_text

    return render(request, "post.html", ctx)

@csrf_exempt
def hello2(request):
    name = request.body.decode()
    print(str(name))
    result = {
    "results":[
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520053700000000000002172887741",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 03:02:13",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4910",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485941448668",
            "order_number":"325487639516323",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"ABKK07-01",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740757VN",
            "fmTrackingNumbers":[
                "LXBVN000021338704"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2109000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1917272.73",
                    "unit_price_currency":"VND",
                    "cod_value":"2109000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2109000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Gia Th\u1ee5y th\u00f4n 6, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Gia Th\u1ee5y",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Gia Th\u1ee5y th\u00f4n 6, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Gia Th\u1ee5y",
                "customer_zip_code":"Ph\u01b0\u1eddng Gia Th\u1ee5y",
                "customer_state":"Qu\u1eadn Long Bi\u00ean",
                "customer_mobile_no":"0366337844",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"khlinh tnt",
                "customer_tel_no":"0366337844",
                "customer_city":"Qu\u1eadn Long Bi\u00ean"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520054300000000000002148852268",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:07:20",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4880",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485927925183",
            "order_number":"325320256580055",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"ABKK07-01",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020741104VN",
            "fmTrackingNumbers":[
                "LXBVN000021329671"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 63 L\u00ea \u0110\u1ee9c Th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 63 L\u00ea \u0110\u1ee9c Th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_zip_code":"Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_state":"Qu\u1eadn Nam T\u1eeb Li\u00eam",
                "customer_mobile_no":"0869071746",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"Thu Ph\u01b0\u01a1ng VH",
                "customer_tel_no":"0869071746",
                "customer_city":"Qu\u1eadn Nam T\u1eeb Li\u00eam"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520032200000000000002159717920",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:23:15",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4840",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485595307457",
            "order_number":"325385046700838",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"ABKK07-01",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739463VN",
            "fmTrackingNumbers":[
                "LXBVN000021335224"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch 15s1 kethien 1 1, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch 15s1 kethien 1 1, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_zip_code":"Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_state":"Qu\u1eadn C\u1ea7u Gi\u1ea5y",
                "customer_mobile_no":"0867316600",
                "customer_country_code":"Vietnam",
                "customer_email":"islesxgempeyi@hotmail.com",
                "customer_name":"Hoang k1",
                "customer_tel_no":"0867316600",
                "customer_city":"Qu\u1eadn C\u1ea7u Gi\u1ea5y"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520094100000000000002153570696",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:53:12",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4890",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485939763303",
            "order_number":"325480601240887",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"ABKK07-01",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739996VN",
            "fmTrackingNumbers":[
                "LXBVN000021336919"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i V\u1ecbt om s\u1ea5u canh ngon b\u1ed5 r\u1ebb, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i V\u1ecbt om s\u1ea5u canh ngon b\u1ed5 r\u1ebb, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i",
                "customer_zip_code":"Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i",
                "customer_state":"Qu\u1eadn Long Bi\u00ean",
                "customer_mobile_no":"0789693723",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"C\u00f4 b\u00e9 d\u1ec5 th\u01b0\u01a1ng th\u1ebf lan BA",
                "customer_tel_no":"0789693723",
                "customer_city":"Qu\u1eadn Long Bi\u00ean"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520037900000000000002163991446",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:24:13",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4840",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486182062225",
            "order_number":"325379049230660",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"ABKK07-01",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739213VN",
            "fmTrackingNumbers":[
                "LXBVN000021334313"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch qq12345, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch qq12345, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_zip_code":"Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_state":"Qu\u1eadn C\u1ea7u Gi\u1ea5y",
                "customer_mobile_no":"0864505147",
                "customer_country_code":"Vietnam",
                "customer_email":"lindoebsturkjj@hotmail.com",
                "customer_name":"qq12345",
                "customer_tel_no":"0864505147",
                "customer_city":"Qu\u1eadn C\u1ea7u Gi\u1ea5y"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520087500000000000002164099015",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:34:28",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485932929356",
            "order_number":"326821168446308",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739382VN",
            "fmTrackingNumbers":[
                "LXBVN000021335858"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Thanh Xu\u00e2n~~~~~~Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam sn 118, H\u00e0 N\u1ed9i, Qu\u1eadn Thanh Xu\u00e2n, Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Thanh Xu\u00e2n~~~~~~Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam sn 118, H\u00e0 N\u1ed9i, Qu\u1eadn Thanh Xu\u00e2n, Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_zip_code":"Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_state":"Qu\u1eadn Thanh Xu\u00e2n",
                "customer_mobile_no":"0964223119",
                "customer_country_code":"Vietnam",
                "customer_email":"ritaejdusodzw@hotmail.com",
                "customer_name":"H\u1ea3i Y\u1ebfn Na",
                "customer_tel_no":"0964223119",
                "customer_city":"Qu\u1eadn Thanh Xu\u00e2n"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520082400000000000002164098456",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:14:21",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486176765540",
            "order_number":"326828327851277",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740004VN",
            "fmTrackingNumbers":[
                "LXBVN000021332766"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2102900.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2102900.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m 83 \u0111\u01b0\u1eddng 26 th\u00e1ng 3, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m 83 \u0111\u01b0\u1eddng 26 th\u00e1ng 3, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_zip_code":"Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0834410535",
                "customer_country_code":"Vietnam",
                "customer_email":"paciusnqnogat@hotmail.com",
                "customer_name":"t\u00f4m baby",
                "customer_tel_no":"0834410535",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520006600000000000002148997514",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:21:43",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4890",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485600262257",
            "order_number":"325388442694695",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020741176VN",
            "fmTrackingNumbers":[
                "LXBVN000021336664"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy Khu ph\u1ed1 4 S\u1ed1 31, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy Khu ph\u1ed1 4 S\u1ed1 31, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_zip_code":"Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0389906499",
                "customer_country_code":"Vietnam",
                "customer_email":"donguyengiahieu@gmail.com",
                "customer_name":"Lan Anh 36rrr",
                "customer_tel_no":"0389906499",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520039400000000000002148889777",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:30:21",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4840",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486181283560",
            "order_number":"325337674133134",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739034VN",
            "fmTrackingNumbers":[
                "LXBVN000021334118"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m \u0110\u01b0\u1eddng 10, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m \u0110\u01b0\u1eddng 10, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_zip_code":"Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0866325566",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"Huy\u1ec1n l\u1ec7",
                "customer_tel_no":"0866325566",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520102100000000000002172635109",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:32:15",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4820",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486176807799",
            "order_number":"326804170712565",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740386VN",
            "fmTrackingNumbers":[
                "LXBVN000021335718"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh atyhb 57uhb fyijj, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh atyhb 57uhb fyijj, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_zip_code":"Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0580214563",
                "customer_country_code":"Vietnam",
                "customer_email":"giahungnguyen35@gmail.com",
                "customer_name":"b\u00e0 nguy\u1ec5n t\u00f4m t\u00e9p off baby",
                "customer_tel_no":"0580214563",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520026700000000000002172466567",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:03:33",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4880",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486174844741",
            "order_number":"325353410980105",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739257VN",
            "fmTrackingNumbers":[
                "LXBVN000021328907"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Long Bi\u00ean Nh\u00e0 V\u0103n H\u00f3a T\u1ed5 12,\u0110\u01b0\u1eddng B\u00e1t Kh\u1ed1i, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Long Bi\u00ean",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Long Bi\u00ean Nh\u00e0 V\u0103n H\u00f3a T\u1ed5 12,\u0110\u01b0\u1eddng B\u00e1t Kh\u1ed1i, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Long Bi\u00ean",
                "customer_zip_code":"Ph\u01b0\u1eddng Long Bi\u00ean",
                "customer_state":"Qu\u1eadn Long Bi\u00ean",
                "customer_mobile_no":"0961127218",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"TH\u1ee4C ANH MN",
                "customer_tel_no":"0961127218",
                "customer_city":"Qu\u1eadn Long Bi\u00ean"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520013000000000000002159752679",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:14:01",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4840",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485592643804",
            "order_number":"325379430959283",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740753VN",
            "fmTrackingNumbers":[
                "LXBVN000021334173"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Thanh Xu\u00e2n~~~~~~Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam s\u1ed1 570 ng\u00f5 175, H\u00e0 N\u1ed9i, Qu\u1eadn Thanh Xu\u00e2n, Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Thanh Xu\u00e2n~~~~~~Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam s\u1ed1 570 ng\u00f5 175, H\u00e0 N\u1ed9i, Qu\u1eadn Thanh Xu\u00e2n, Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_zip_code":"Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_state":"Qu\u1eadn Thanh Xu\u00e2n",
                "customer_mobile_no":"0977474875",
                "customer_country_code":"Vietnam",
                "customer_email":"hffju@gmail.com",
                "customer_name":"Ho\u00e0ng Th\u00f9y na",
                "customer_tel_no":"0977474875",
                "customer_city":"Qu\u1eadn Thanh Xu\u00e2n"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520012400000000000002153474330",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:13:41",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485595858706",
            "order_number":"325384629712798",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020744597VN",
            "fmTrackingNumbers":[
                "LXBVN000021333323"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2102900.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2102900.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m 16 b\u00ecnh ph\u00fa, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m 16 b\u00ecnh ph\u00fa, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_zip_code":"Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0857183425",
                "customer_country_code":"Vietnam",
                "customer_email":"pirkeyhsbogdanhm@hotmail.com",
                "customer_name":"t\u00f4m baby",
                "customer_tel_no":"0857183425",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520050100000000000002172778268",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:29:08",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485599356290",
            "order_number":"325416253354260",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739821VN",
            "fmTrackingNumbers":[
                "LXBVN000021336225"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2102900.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2102900.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy sghdjre, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy sghdjre, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_zip_code":"Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0778165981",
                "customer_country_code":"Vietnam",
                "customer_email":"hieulam203@gmail.com",
                "customer_name":"Mai VK",
                "customer_tel_no":"0778165981",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520084900000000000002172815072",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 02:07:20",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486186652146",
            "order_number":"325433481649687",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740330VN",
            "fmTrackingNumbers":[
                "LXBVN000021337982"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Ng\u1ecdc L\u00e2m T\u00f4m h\u00f9m ngon \u0111\u1eb7c s\u1ea3n v\u00f9ng bi\u1ec3n, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Ng\u1ecdc L\u00e2m",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Ng\u1ecdc L\u00e2m T\u00f4m h\u00f9m ngon \u0111\u1eb7c s\u1ea3n v\u00f9ng bi\u1ec3n, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Ng\u1ecdc L\u00e2m",
                "customer_zip_code":"Ph\u01b0\u1eddng Ng\u1ecdc L\u00e2m",
                "customer_state":"Qu\u1eadn Long Bi\u00ean",
                "customer_mobile_no":"0825971184",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"So\u00e1i ca T\u00f9ng th\u1ebf lan BA",
                "customer_tel_no":"0825971184",
                "customer_city":"Qu\u1eadn Long Bi\u00ean"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520057300000000000002149032668",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:32:27",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4850",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485931165835",
            "order_number":"325378462245334",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739211VN",
            "fmTrackingNumbers":[
                "LXBVN000021335720"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch H\u1ea1nh Trang 37 \u00d0\u1ee9c Giang 610, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch H\u1ea1nh Trang 37 \u00d0\u1ee9c Giang 610, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_zip_code":"Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_state":"Qu\u1eadn C\u1ea7u Gi\u1ea5y",
                "customer_mobile_no":"0882438325",
                "customer_country_code":"Vietnam",
                "customer_email":"payeurbomasellv@hotmail.com",
                "customer_name":"H\u1ea1nh Trang 37 \u00d0\u1ee9c Giang 610",
                "customer_tel_no":"0882438325",
                "customer_city":"Qu\u1eadn C\u1ea7u Gi\u1ea5y"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520063600000000000002167449196",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:21:49",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4880",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485935904015",
            "order_number":"326750567436608",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020743832VN",
            "fmTrackingNumbers":[
                "LXBVN000021334199"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 l\u00ea \u0111\u1ee9c th\u1ecd ng\u00f563, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 l\u00ea \u0111\u1ee9c th\u1ecd ng\u00f563, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_zip_code":"Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_state":"Qu\u1eadn Nam T\u1eeb Li\u00eam",
                "customer_mobile_no":"0909229668",
                "customer_country_code":"Vietnam",
                "customer_email":"nguyennhung88868@gmail.com",
                "customer_name":"Nhung Nguy\u1ec5n D",
                "customer_tel_no":"0909229668",
                "customer_city":"Qu\u1eadn Nam T\u1eeb Li\u00eam"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520053500000000000002172515558",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:29:52",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4840",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486180814936",
            "order_number":"325362469672424",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739219VN",
            "fmTrackingNumbers":[
                "LXBVN000021336049"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng B\u1ed3 \u0110\u1ec1 Sn 24 t\u00f4 hi\u1ec7u, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng B\u1ed3 \u0110\u1ec1",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng B\u1ed3 \u0110\u1ec1 Sn 24 t\u00f4 hi\u1ec7u, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng B\u1ed3 \u0110\u1ec1",
                "customer_zip_code":"Ph\u01b0\u1eddng B\u1ed3 \u0110\u1ec1",
                "customer_state":"Qu\u1eadn Long Bi\u00ean",
                "customer_mobile_no":"0344881672",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"Ph\u1ea9m dz-jmn",
                "customer_tel_no":"0344881672",
                "customer_city":"Qu\u1eadn Long Bi\u00ean"
            }
        },
        {
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "error_message":"CODE: CNGFC_G_GCBS_CATEGORY_REGISTER_SERVICE_API_EXCEPTION, MESSAGE: gcbs category register remote service api exception \u63a5\u53e3\u5f02\u5e38",
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "package_sequence":"LP00485598762641",
            "success":"false",
            "tracking_number":"LEXST0020740250VN",
            "error_code":"CNGFC_G_GCBS_CATEGORY_REGISTER_SERVICE_API_EXCEPTION",
            "sort_code":"HKGAHAN33-02",
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch 18 tran vy N, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch 18 tran vy N, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_zip_code":"Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_state":"Qu\u1eadn C\u1ea7u Gi\u1ea5y",
                "customer_mobile_no":"0379326555",
                "customer_country_code":"Vietnam",
                "customer_email":"cylindrical1972folk@gmail.com",
                "customer_name":"Anan",
                "customer_tel_no":"0379326555",
                "customer_city":"Qu\u1eadn C\u1ea7u Gi\u1ea5y"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"55000494",
                "shipper_seller_id":"VN33W2WP1G",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"POCO Official Global Store",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520028600000000000002157756796",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 21:05:19",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.5420",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485894064933",
            "order_number":"325920691161236",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020744500VN",
            "fmTrackingNumbers":[
                "LXBVN000021466474"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"3080000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i POCO M3 ( 4GB\/64GB  4GB\/128GB ) - Pin 6000mAh m\u00e0n h\u00ecnh 6.53Inch",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"2800000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"3080000.0000",
                    "sku":"1478306899_VNAMZ-6153823319",
                    "unit_price":"3180000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i POCO M3 ( 4GB\/64GB  4GB\/128GB ) - Pin 6000mAh m\u00e0n h\u00ecnh 6.53Inch",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m 210\/216\/341 chu h\u01b0\u01a1ng, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m 210\/216\/341 chu h\u01b0\u01a1ng, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_zip_code":"Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0353288546",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"V\u1eccNG L\u1ec6",
                "customer_tel_no":"0353288546",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520042000000000000002148937364",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:20:42",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485599788799",
            "order_number":"325407037846440",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740597VN",
            "fmTrackingNumbers":[
                "LXBVN000021336346"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i DV TT , Thon v\u0103n m\u00f4n x\u00e3 h\u1ee3p ti\u1ebfn huy\u1ec7n c\u1ee7 chi ph\u01b0\u01a1ng ba th\u00e1ng hai, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i DV TT , Thon v\u0103n m\u00f4n x\u00e3 h\u1ee3p ti\u1ebfn huy\u1ec7n c\u1ee7 chi ph\u01b0\u01a1ng ba th\u00e1ng hai, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i",
                "customer_zip_code":"Ph\u01b0\u1eddng C\u1ef1 Kh\u1ed1i",
                "customer_state":"Qu\u1eadn Long Bi\u00ean",
                "customer_mobile_no":"0855620937",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"Ng\u00f4 Ho\u00e0ng Mi\u00ean th\u1ebf nam BA",
                "customer_tel_no":"0855620937",
                "customer_city":"Qu\u1eadn Long Bi\u00ean"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520027900000000000002159740304",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:07:19",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485596476806",
            "order_number":"325356426154035",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739298VN",
            "fmTrackingNumbers":[
                "LXBVN000021331162"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 5 Cao \u0110\u1ea1t, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 5 Cao \u0110\u1ea1t, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_zip_code":"Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_state":"Qu\u1eadn Nam T\u1eeb Li\u00eam",
                "customer_mobile_no":"0337435050",
                "customer_country_code":"Vietnam",
                "customer_email":"oanhluong1998@gmail.com",
                "customer_name":"Oanh 36H",
                "customer_tel_no":"0337435050",
                "customer_city":"Qu\u1eadn Nam T\u1eeb Li\u00eam"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"55000494",
                "shipper_seller_id":"VN33W2WP1G",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"POCO Official Global Store",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520022200000000000002168404938",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 21:06:00",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.5420",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485896680169",
            "order_number":"327393169854929",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020745360VN",
            "fmTrackingNumbers":[
                "LXBVN000021466110"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2992900.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i POCO M3 ( 4GB\/64GB  4GB\/128GB ) - Pin 6000mAh m\u00e0n h\u00ecnh 6.53Inch",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"2800000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2992900.0000",
                    "sku":"1478306899_VNAMZ-6153823319",
                    "unit_price":"3180000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i POCO M3 ( 4GB\/64GB  4GB\/128GB ) - Pin 6000mAh m\u00e0n h\u00ecnh 6.53Inch",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng Thanh Nh\u00e0n 392 Kinh Duong Vuong, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng Thanh Nh\u00e0n",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng Thanh Nh\u00e0n 392 Kinh Duong Vuong, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng Thanh Nh\u00e0n",
                "customer_zip_code":"Ph\u01b0\u1eddng Thanh Nh\u00e0n",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0301754809",
                "customer_country_code":"Vietnam",
                "customer_email":"namduongtx2730@gmail.com",
                "customer_name":"LY AN HAT TUAN",
                "customer_tel_no":"0301754809",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520077200000000000002163990993",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:07:16",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4880",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485931566843",
            "order_number":"325375018209891",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020741016VN",
            "fmTrackingNumbers":[
                "LXBVN000021333651"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2102900.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2102900.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Long Bi\u00ean ng\u00f5 8 x\u00f3m 2, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Long Bi\u00ean",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Long Bi\u00ean ng\u00f5 8 x\u00f3m 2, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Long Bi\u00ean",
                "customer_zip_code":"Ph\u01b0\u1eddng Long Bi\u00ean",
                "customer_state":"Qu\u1eadn Long Bi\u00ean",
                "customer_mobile_no":"0944622001",
                "customer_country_code":"Vietnam",
                "customer_email":"nga02012021@gmail.com",
                "customer_name":"Nga tnt",
                "customer_tel_no":"0944622001",
                "customer_city":"Qu\u1eadn Long Bi\u00ean"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520101600000000000002148757248",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:09:04",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486179771505",
            "order_number":"326792332490185",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739272VN",
            "fmTrackingNumbers":[
                "LXBVN000021332728"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh Hia b\u00e0 tr\u01b0ng s\u1ed1 nh\u00e0 b\u1ea3y tr\u0103m hai m\u01b0\u01a1i l\u0103m \u0110\u01b0\u1eddng, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh Hia b\u00e0 tr\u01b0ng s\u1ed1 nh\u00e0 b\u1ea3y tr\u0103m hai m\u01b0\u01a1i l\u0103m \u0110\u01b0\u1eddng, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_zip_code":"Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0863540466",
                "customer_country_code":"Vietnam",
                "customer_email":"anhmaingo12@emailmely.com",
                "customer_name":"Anh Mai Ngo Ff m\u1ef9 h\u1ea1nh",
                "customer_tel_no":"0863540466",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "error_message":"CODE: CNGFC_G_GCBS_CATEGORY_REGISTER_SERVICE_API_EXCEPTION, MESSAGE: gcbs category register remote service api exception \u63a5\u53e3\u5f02\u5e38",
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "package_sequence":"LP00486175294677",
            "success":"false",
            "tracking_number":"LEXST0020737500VN",
            "error_code":"CNGFC_G_GCBS_CATEGORY_REGISTER_SERVICE_API_EXCEPTION",
            "sort_code":"HKGAHAN33-02",
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh Nh\u00e0 s\u1ed1 168\/5 \u0111\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh Nh\u00e0 s\u1ed1 168\/5 \u0111\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_zip_code":"Ph\u01b0\u1eddng Tr\u01b0\u01a1ng \u0110\u1ecbnh",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0589157423",
                "customer_country_code":"Vietnam",
                "customer_email":"isemanpwmorlasmz@hotmail.com",
                "customer_name":"H\u1ed3 Ho\u00e0i Phong",
                "customer_tel_no":"0589157423",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"55000494",
                "shipper_seller_id":"VN33W2WP1G",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"POCO Official Global Store",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520100900000000000002168464812",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 21:07:02",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.5460",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485897017087",
            "order_number":"325950478973105",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020743831VN",
            "fmTrackingNumbers":[
                "LXBVN000021466511"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"3080000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i POCO M3 ( 4GB\/64GB  4GB\/128GB ) - Pin 6000mAh m\u00e0n h\u00ecnh 6.53Inch",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"2800000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"3080000.0000",
                    "sku":"1478306899_VNAMZ-6153823319",
                    "unit_price":"3180000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i POCO M3 ( 4GB\/64GB  4GB\/128GB ) - Pin 6000mAh m\u00e0n h\u00ecnh 6.53Inch",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m v\u00edmmmsmskc nsnamammck, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m v\u00edmmmsmskc nsnamammck, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_zip_code":"Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0942567082",
                "customer_country_code":"Vietnam",
                "customer_email":"phoeukkfsenion4@hotmail.com",
                "customer_name":"lu\u1eadt",
                "customer_tel_no":"0942567082",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520003100000000000002167449149",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:34:32",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4820",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486175991913",
            "order_number":"326785966603898",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739658VN",
            "fmTrackingNumbers":[
                "LXBVN000021334572"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch 19 tran vi vi 1 3, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch 19 tran vi vi 1 3, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_zip_code":"Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_state":"Qu\u1eadn C\u1ea7u Gi\u1ea5y",
                "customer_mobile_no":"0864302199",
                "customer_country_code":"Vietnam",
                "customer_email":"vietorctyagodw@hotmail.com",
                "customer_name":"Hoang h23",
                "customer_tel_no":"0864302199",
                "customer_city":"Qu\u1eadn C\u1ea7u Gi\u1ea5y"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520022900000000000002164002767",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:07:54",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4850",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486172475847",
            "order_number":"325375814716659",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739017VN",
            "fmTrackingNumbers":[
                "LXBVN000021330956"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2102900.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2102900.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 ng\u00f5 63 l\u00ea \u0111\u1ee9c th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 ng\u00f5 63 l\u00ea \u0111\u1ee9c th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_zip_code":"Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_state":"Qu\u1eadn Nam T\u1eeb Li\u00eam",
                "customer_mobile_no":"0334079865",
                "customer_country_code":"Vietnam",
                "customer_email":"teaterirbunde1@hotmail.com",
                "customer_name":"minhduy vh",
                "customer_tel_no":"0334079865",
                "customer_city":"Qu\u1eadn Nam T\u1eeb Li\u00eam"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"55000494",
                "shipper_seller_id":"VN33W2WP1G",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"POCO Official Global Store",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520069900000000000002149129484",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 02:59:31",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.6300",
                "packing_type":"",
                "payment_method":"MOMO_WALLET"
            },
            "package_material":"M",
            "package_sequence":"LP00485605932872",
            "order_number":"326901544570663",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020741666VN",
            "fmTrackingNumbers":[
                "LXBVN000021340175"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"5190000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i POCO X3 Pro  (6GB\/128GB  8GB\/256GB)",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"4690909.09",
                    "unit_price_currency":"VND",
                    "cod_value":"0",
                    "sku":"1474986015_VNAMZ-6131907550",
                    "unit_price":"5190000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i POCO X3 Pro  (6GB\/128GB  8GB\/256GB)",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"\u0110\u1ed3ng Th\u00e1p~~~Th\u00e0nh Ph\u1ed1 Sa \u0110\u00e9c~~~~~~Ph\u01b0\u1eddng An H\u00f2a 12C khu d\u00e2n c\u01b0 R\u1ea1ch R\u1eaby, kh\u00f3m T\u00e2n B\u00ecnh, \u0110\u1ed3ng Th\u00e1p, Th\u00e0nh Ph\u1ed1 Sa \u0110\u00e9c, Ph\u01b0\u1eddng An H\u00f2a",
                "customer_address2":"\u0110\u1ed3ng Th\u00e1p~~~Th\u00e0nh Ph\u1ed1 Sa \u0110\u00e9c~~~~~~Ph\u01b0\u1eddng An H\u00f2a 12C khu d\u00e2n c\u01b0 R\u1ea1ch R\u1eaby, kh\u00f3m T\u00e2n B\u00ecnh, \u0110\u1ed3ng Th\u00e1p, Th\u00e0nh Ph\u1ed1 Sa \u0110\u00e9c, Ph\u01b0\u1eddng An H\u00f2a",
                "customer_zip_code":"Ph\u01b0\u1eddng An H\u00f2a",
                "customer_state":"Th\u00e0nh Ph\u1ed1 Sa \u0110\u00e9c",
                "customer_mobile_no":"0901214120",
                "customer_country_code":"Vietnam",
                "customer_email":"doantuyet0@gmail.com",
                "customer_name":"Tr\u01b0\u01a1ng Thi\u0323 Minh Th\u01b0",
                "customer_tel_no":"0901214120",
                "customer_city":"Th\u00e0nh Ph\u1ed1 Sa \u0110\u00e9c"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520086300000000000002172550319",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:07:48",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4900",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485930984597",
            "order_number":"326739399197863",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739495VN",
            "fmTrackingNumbers":[
                "LXBVN000021329309"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"\u0110\u00e0 N\u1eb5ng~~~Qu\u1eadn Li\u00ean Chi\u1ec3u~~~~~~Ph\u01b0\u1eddng H\u00f2a Minh D\u01b0\u01a1ng b\u00edch li\u00ean 101, \u0110\u00e0 N\u1eb5ng, Qu\u1eadn Li\u00ean Chi\u1ec3u, Ph\u01b0\u1eddng H\u00f2a Minh",
                "customer_address2":"\u0110\u00e0 N\u1eb5ng~~~Qu\u1eadn Li\u00ean Chi\u1ec3u~~~~~~Ph\u01b0\u1eddng H\u00f2a Minh D\u01b0\u01a1ng b\u00edch li\u00ean 101, \u0110\u00e0 N\u1eb5ng, Qu\u1eadn Li\u00ean Chi\u1ec3u, Ph\u01b0\u1eddng H\u00f2a Minh",
                "customer_zip_code":"Ph\u01b0\u1eddng H\u00f2a Minh",
                "customer_state":"Qu\u1eadn Li\u00ean Chi\u1ec3u",
                "customer_mobile_no":"0905561526",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"Qu\u1ef3nh th\u01b0",
                "customer_tel_no":"0905561526",
                "customer_city":"Qu\u1eadn Li\u00ean Chi\u1ec3u"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520093000000000000002149140380",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 02:06:31",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4890",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485934801983",
            "order_number":"325499208127667",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740594VN",
            "fmTrackingNumbers":[
                "LXBVN000021337431"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"1990000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"1990000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 ng\u00f5 21 l\u00ea \u0111\u1ee9c th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 ng\u00f5 21 l\u00ea \u0111\u1ee9c th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_zip_code":"Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_state":"Qu\u1eadn Nam T\u1eeb Li\u00eam",
                "customer_mobile_no":"0562042780",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"huy\u1ec1n linh A",
                "customer_tel_no":"0562042780",
                "customer_city":"Qu\u1eadn Nam T\u1eeb Li\u00eam"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520007000000000000002167689117",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 02:14:26",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485943278404",
            "order_number":"326901133270622",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020741508VN",
            "fmTrackingNumbers":[
                "LXBVN000021337557"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy \u0110\u01b0\u1eddng 34, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy \u0110\u01b0\u1eddng 34, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_zip_code":"Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0377953556",
                "customer_country_code":"Vietnam",
                "customer_email":"quynhly15122004@gmail.com",
                "customer_name":"Qly 36rrr",
                "customer_tel_no":"0377953556",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520098200000000000002149032866",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:37:43",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485938161118",
            "order_number":"325324893993330",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740890VN",
            "fmTrackingNumbers":[
                "LXBVN000021337031"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m Sn 234\/56 dg hi\u1ec7p b\u00ecnh, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m Sn 234\/56 dg hi\u1ec7p b\u00ecnh, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_zip_code":"Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0327458663",
                "customer_country_code":"Vietnam",
                "customer_email":"brentsuwcorbi0n@hotmail.com",
                "customer_name":"D\u01b0\u01a1ngTh\u1ea3o Quyen",
                "customer_tel_no":"0327458663",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520054100000000000002159789347",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:28:23",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485934195359",
            "order_number":"325346867340008",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740233VN",
            "fmTrackingNumbers":[
                "LXBVN000021335363"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Thanh Xu\u00e2n~~~~~~Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam 64 ng\u00f5 66a ph\u1ed1 tri\u1ec1u kh\u00fac, H\u00e0 N\u1ed9i, Qu\u1eadn Thanh Xu\u00e2n, Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Thanh Xu\u00e2n~~~~~~Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam 64 ng\u00f5 66a ph\u1ed1 tri\u1ec1u kh\u00fac, H\u00e0 N\u1ed9i, Qu\u1eadn Thanh Xu\u00e2n, Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_zip_code":"Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_state":"Qu\u1eadn Thanh Xu\u00e2n",
                "customer_mobile_no":"0848196195",
                "customer_country_code":"Vietnam",
                "customer_email":"1988nguyenvandung.qy1@gmail.com",
                "customer_name":"Qu\u1ef3nh Miu NA",
                "customer_tel_no":"0848196195",
                "customer_city":"Qu\u1eadn Thanh Xu\u00e2n"
            }
        },
        {
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "error_message":"CODE: CNGFC_G_GCBS_CATEGORY_REGISTER_SERVICE_API_EXCEPTION, MESSAGE: gcbs category register remote service api exception \u63a5\u53e3\u5f02\u5e38",
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "package_sequence":"LP00485596422721",
            "success":"false",
            "tracking_number":"LEXST0020740664VN",
            "error_code":"CNGFC_G_GCBS_CATEGORY_REGISTER_SERVICE_API_EXCEPTION",
            "sort_code":"HKGAHAN33-02",
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 ng\u00f5 63 le \u0111\u1ee9c th\u1ecd 42, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 ng\u00f5 63 le \u0111\u1ee9c th\u1ecd 42, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_zip_code":"Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_state":"Qu\u1eadn Nam T\u1eeb Li\u00eam",
                "customer_mobile_no":"0355245911",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"kim anh A",
                "customer_tel_no":"0355245911",
                "customer_city":"Qu\u1eadn Nam T\u1eeb Li\u00eam"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520039000000000000002172527175",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:28:35",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485933343121",
            "order_number":"325373679272204",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739893VN",
            "fmTrackingNumbers":[
                "LXBVN000021334452"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2102900.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2102900.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy nenkgmff, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy nenkgmff, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_zip_code":"Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0390367918",
                "customer_country_code":"Vietnam",
                "customer_email":"nhatminh986@gmail.com",
                "customer_name":"Nh\u00e2n VK",
                "customer_tel_no":"0390367918",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "error_message":"CODE: CNGFC_G_GCBS_CATEGORY_REGISTER_SERVICE_API_EXCEPTION, MESSAGE: gcbs category register remote service api exception \u63a5\u53e3\u5f02\u5e38",
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "package_sequence":"LP00485934782578",
            "success":"false",
            "tracking_number":"LEXST0020740228VN",
            "error_code":"CNGFC_G_GCBS_CATEGORY_REGISTER_SERVICE_API_EXCEPTION",
            "sort_code":"HKGAHAN33-02",
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Giang Bi\u00ean s\u1ed1 46 ng\u00e1ch 5 \u0111\u01b0\u1eddng H\u1ed3ng b\u00e0ng th\u00f4n 5 x\u00e3 ngh\u0129a H\u01b0ng, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Giang Bi\u00ean",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Long Bi\u00ean~~~~~~Ph\u01b0\u1eddng Giang Bi\u00ean s\u1ed1 46 ng\u00e1ch 5 \u0111\u01b0\u1eddng H\u1ed3ng b\u00e0ng th\u00f4n 5 x\u00e3 ngh\u0129a H\u01b0ng, H\u00e0 N\u1ed9i, Qu\u1eadn Long Bi\u00ean, Ph\u01b0\u1eddng Giang Bi\u00ean",
                "customer_zip_code":"Ph\u01b0\u1eddng Giang Bi\u00ean",
                "customer_state":"Qu\u1eadn Long Bi\u00ean",
                "customer_mobile_no":"0783982956",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"Lan H\u01b0\u01a1ng Nguy\u1ec5n Minh th\u1ebf Ph\u01b0\u1ee3ng BA",
                "customer_tel_no":"0783982956",
                "customer_city":"Qu\u1eadn Long Bi\u00ean"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520013200000000000002164026909",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:16:44",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4840",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485931033161",
            "order_number":"325415830079873",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740211VN",
            "fmTrackingNumbers":[
                "LXBVN000021333328"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2112000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2112000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u1ed3 Ch\u00ed Minh~~~Qu\u1eadn Th\u1ee7 \u0110\u1ee9c~~~~~~Ph\u01b0\u1eddng Hi\u1ec7p B\u00ecnh Ch\u00e1nh Dung SANN Nguy\u1ec5n th\u1ecb \u0111un, H\u1ed3 Ch\u00ed Minh, Qu\u1eadn Th\u1ee7 \u0110\u1ee9c, Ph\u01b0\u1eddng Hi\u1ec7p B\u00ecnh Ch\u00e1nh",
                "customer_address2":"H\u1ed3 Ch\u00ed Minh~~~Qu\u1eadn Th\u1ee7 \u0110\u1ee9c~~~~~~Ph\u01b0\u1eddng Hi\u1ec7p B\u00ecnh Ch\u00e1nh Dung SANN Nguy\u1ec5n th\u1ecb \u0111un, H\u1ed3 Ch\u00ed Minh, Qu\u1eadn Th\u1ee7 \u0110\u1ee9c, Ph\u01b0\u1eddng Hi\u1ec7p B\u00ecnh Ch\u00e1nh",
                "customer_zip_code":"Ph\u01b0\u1eddng Hi\u1ec7p B\u00ecnh Ch\u00e1nh",
                "customer_state":"Qu\u1eadn Th\u1ee7 \u0110\u1ee9c",
                "customer_mobile_no":"0815524424",
                "customer_country_code":"Vietnam",
                "customer_email":"59hauye@emailsida.com",
                "customer_name":"Ha Uyen Pham",
                "customer_tel_no":"0815524424",
                "customer_city":"Qu\u1eadn Th\u1ee7 \u0110\u1ee9c"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520027500000000000002172563393",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:18:37",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4840",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485934063441",
            "order_number":"325435605829333",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020743638VN",
            "fmTrackingNumbers":[
                "LXBVN000021336052"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 s\u1ed1 12 ng\u00f5 63 L\u00ea \u0110\u1ee9c Th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 s\u1ed1 12 ng\u00f5 63 L\u00ea \u0110\u1ee9c Th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_zip_code":"Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_state":"Qu\u1eadn Nam T\u1eeb Li\u00eam",
                "customer_mobile_no":"0969274170",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"Y\u1ebfn vh",
                "customer_tel_no":"0969274170",
                "customer_city":"Qu\u1eadn Nam T\u1eeb Li\u00eam"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520027000000000000002153354905",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:09:43",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"1.5600",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486178726657",
            "order_number":"325375422946424",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739667VN",
            "fmTrackingNumbers":[
                "LXBVN000021333677"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"7810000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Tablets",
                    "item_desc":"M\u00e1y T\u00ednh B\u1ea3ng Xiaomi Pad 5  6+128GB|6+256GB 11 inch",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"84713020"
                        }
                    },
                    "import_declaration_value":"7236363.64",
                    "unit_price_currency":"VND",
                    "cod_value":"7810000.0000",
                    "sku":"1522193749_VNAMZ-6392194784",
                    "unit_price":"7990000.0000",
                    "item_desc_en":"M\u00e1y T\u00ednh B\u1ea3ng Xiaomi Pad 5  6+128GB|6+256GB 11 inch",
                    "product_category_id":"400305"
                }
            ],
            "customer":{
                "customer_address1":"Th\u1eeba Thi\u00ean Hu\u1ebf~~~Th\u00e0nh Ph\u1ed1 Hu\u1ebf~~~~~~Ph\u01b0\u1eddng Ph\u00fa Nhu\u1eadn S\u1ed1 nh\u00e0 19,ki\u1ec7t 87, Nguy\u1ec5n Hu\u1ec7, Th\u1eeba Thi\u00ean Hu\u1ebf, Th\u00e0nh Ph\u1ed1 Hu\u1ebf, Ph\u01b0\u1eddng Ph\u00fa Nhu\u1eadn",
                "customer_address2":"Th\u1eeba Thi\u00ean Hu\u1ebf~~~Th\u00e0nh Ph\u1ed1 Hu\u1ebf~~~~~~Ph\u01b0\u1eddng Ph\u00fa Nhu\u1eadn S\u1ed1 nh\u00e0 19,ki\u1ec7t 87, Nguy\u1ec5n Hu\u1ec7, Th\u1eeba Thi\u00ean Hu\u1ebf, Th\u00e0nh Ph\u1ed1 Hu\u1ebf, Ph\u01b0\u1eddng Ph\u00fa Nhu\u1eadn",
                "customer_zip_code":"Ph\u01b0\u1eddng Ph\u00fa Nhu\u1eadn",
                "customer_state":"Th\u00e0nh Ph\u1ed1 Hu\u1ebf",
                "customer_mobile_no":"0395489070",
                "customer_country_code":"Vietnam",
                "customer_email":"nguyenduchoanga21998@gmail.com",
                "customer_name":"Nguy\u1ec5n \u0110\u1ee9c Ho\u00e0ng",
                "customer_tel_no":"0395489070",
                "customer_city":"Th\u00e0nh Ph\u1ed1 Hu\u1ebf"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520055300000000000002148829083",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:29:06",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4900",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485935400638",
            "order_number":"326810768654317",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739502VN",
            "fmTrackingNumbers":[
                "LXBVN000021334374"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch Di\u1ec5m Th\u00fay 66 B\u00ecnh \u00d0\u1ea1t 596, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch Di\u1ec5m Th\u00fay 66 B\u00ecnh \u00d0\u1ea1t 596, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_zip_code":"Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_state":"Qu\u1eadn C\u1ea7u Gi\u1ea5y",
                "customer_mobile_no":"0884732289",
                "customer_country_code":"Vietnam",
                "customer_email":"kragerfasuderr@hotmail.com",
                "customer_name":"Di\u1ec5m Th\u00fay 66 B\u00ecnh \u00d0\u1ea1t 596",
                "customer_tel_no":"0884732289",
                "customer_city":"Qu\u1eadn C\u1ea7u Gi\u1ea5y"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520014600000000000002153534180",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:20:11",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4880",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485936258293",
            "order_number":"325334866691971",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740662VN",
            "fmTrackingNumbers":[
                "LXBVN000021334340"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Thanh Xu\u00e2n~~~~~~Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam tri\u1ec1u kh\u00fac 303, H\u00e0 N\u1ed9i, Qu\u1eadn Thanh Xu\u00e2n, Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Thanh Xu\u00e2n~~~~~~Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam tri\u1ec1u kh\u00fac 303, H\u00e0 N\u1ed9i, Qu\u1eadn Thanh Xu\u00e2n, Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_zip_code":"Ph\u01b0\u1eddng Thanh Xu\u00e2n Nam",
                "customer_state":"Qu\u1eadn Thanh Xu\u00e2n",
                "customer_mobile_no":"0586309409",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"susu hyna",
                "customer_tel_no":"0586309409",
                "customer_city":"Qu\u1eadn Thanh Xu\u00e2n"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520070800000000000002167544789",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:19:47",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4890",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485601216177",
            "order_number":"325430223387513",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739979VN",
            "fmTrackingNumbers":[
                "LXBVN000021337220"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2030000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2030000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 Ng\u00f5 63 L\u00ea \u0110\u1ee9c Th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Nam T\u1eeb Li\u00eam~~~~~~Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2 Ng\u00f5 63 L\u00ea \u0110\u1ee9c Th\u1ecd, H\u00e0 N\u1ed9i, Qu\u1eadn Nam T\u1eeb Li\u00eam, Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_zip_code":"Ph\u01b0\u1eddng M\u1ef9 \u0110\u00ecnh 2",
                "customer_state":"Qu\u1eadn Nam T\u1eeb Li\u00eam",
                "customer_mobile_no":"0384308037",
                "customer_country_code":"Vietnam",
                "customer_email":"noreply@support.lazada.com",
                "customer_name":"Panda H\u1ea1nh D",
                "customer_tel_no":"0384308037",
                "customer_city":"Qu\u1eadn Nam T\u1eeb Li\u00eam"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520061000000000000002172646667",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:26:19",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4850",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486180952166",
            "order_number":"326829751892104",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020744403VN",
            "fmTrackingNumbers":[
                "LXBVN000021334434"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy 12 M\u00ecnh khai, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy 12 M\u00ecnh khai, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_zip_code":"Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0703925645",
                "customer_country_code":"Vietnam",
                "customer_email":"suozzohookanol@hotmail.com",
                "customer_name":"b\u00e9 nh\u1ecf hy",
                "customer_tel_no":"0703925645",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520004300000000000002153318518",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:05:31",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00485932196175",
            "order_number":"326748526730242",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020739232VN",
            "fmTrackingNumbers":[
                "LXBVN000021329629"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy 163 42, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng V\u0129nh Tuy 163 42, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_zip_code":"Ph\u01b0\u1eddng V\u0129nh Tuy",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0383428030",
                "customer_country_code":"Vietnam",
                "customer_email":"tranthanhbach4@gmail.com",
                "customer_name":"Thanh B\u1ea1ch 36rrr",
                "customer_tel_no":"0383428030",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520071000000000000002163883591",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:06:27",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4860",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486179423882",
            "order_number":"325373215600244",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020741121VN",
            "fmTrackingNumbers":[
                "LXBVN000021333256"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972700",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m \u0110\u01b0\u1eddng 9,Ng\u00f5 15, T\u1ed5 285, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn Hai B\u00e0 Tr\u01b0ng~~~~~~Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m \u0110\u01b0\u1eddng 9,Ng\u00f5 15, T\u1ed5 285, H\u00e0 N\u1ed9i, Qu\u1eadn Hai B\u00e0 Tr\u01b0ng, Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_zip_code":"Ph\u01b0\u1eddng \u0110\u1ed3ng T\u00e2m",
                "customer_state":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng",
                "customer_mobile_no":"0980690668",
                "customer_country_code":"Vietnam",
                "customer_email":"patriciaxneymar@outlook.com",
                "customer_name":"Le Thi Tu Quynh",
                "customer_tel_no":"0980690668",
                "customer_city":"Qu\u1eadn Hai B\u00e0 Tr\u01b0ng"
            }
        },
        {
            "shipper":{
                "shipper_tel_no":"21572730",
                "shipper_seller_id":"VN33W2SI3X",
                "shipper_address1":"China^^^^^^^^^^^^~~~~~~~~~~~~xiang gang yue hai quan qiu gong ying lian you xian gong si  Hong Kong YH Global Logistics CS Co.,LTD,Hong Kong",
                "shipper_city":"cainiao",
                "shipper_country_code":"CN",
                "shipper_name":"Xiaomi Official Store Global",
                "shipper_zip_code":"00000"
            },
            "pallet_number":"",
            "parcel":{
                "package_number":"FU2520082500000000000002159788681",
                "service_type":"standard",
                "package_weight_unit":"KG",
                "total_pieces_in_package":"1",
                "create_time":"2021-12-12 01:24:32",
                "package_price_currency":"VND",
                "biz_type":"LZD",
                "package_weight":"0.4840",
                "packing_type":"",
                "payment_method":"CashOnDelivery"
            },
            "package_material":"M",
            "package_sequence":"LP00486177035125",
            "order_number":"326761163212022",
            "bag":{
                "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
                "total_packages_in_bag":"48",
                "bag_net_package_weight":"24.74",
                "bag_weight":"26.4300",
                "bag_weight_unit":"KG"
            },
            "remark":"",
            "sort_code":"HKGAHAN33-02",
            "bag_id":"HKGAHAN33-02-HK2112132054-0804SM",
            "container_number":"",
            "success":"true",
            "tracking_number":"LEXST0020740016VN",
            "fmTrackingNumbers":[
                "LXBVN000021334789"
            ],
            "items":[
                {
                    "pieces":"1",
                    "paid_price":"2090000.0000",
                    "product_category_name":"Root Category\/Mobiles & Tablets\/Smartphones",
                    "item_desc":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "hts_code":{
                        "customized":{
                            "hts_code_1":"85171200"
                        }
                    },
                    "import_declaration_value":"1900000.00",
                    "unit_price_currency":"VND",
                    "cod_value":"2090000.0000",
                    "sku":"1406590277_VNAMZ-5826972698",
                    "unit_price":"2090000.0000",
                    "item_desc_en":"\u0110i\u1ec7n tho\u1ea1i Xiaomi Redmi 9A 2GB\/32GB - Chip MediaTek Helio G25 8 nh\u00e2n (12 nm), M\u00e0n h\u00ecnh 6.53\" HD+, Camera 13MP, Pin 5000 mAh",
                    "product_category_id":"400304"
                }
            ],
            "customer":{
                "customer_address1":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch 17a1 doankethien 12\/11 6, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_address2":"H\u00e0 N\u1ed9i~~~Qu\u1eadn C\u1ea7u Gi\u1ea5y~~~~~~Ph\u01b0\u1eddng Mai D\u1ecbch 17a1 doankethien 12\/11 6, H\u00e0 N\u1ed9i, Qu\u1eadn C\u1ea7u Gi\u1ea5y, Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_zip_code":"Ph\u01b0\u1eddng Mai D\u1ecbch",
                "customer_state":"Qu\u1eadn C\u1ea7u Gi\u1ea5y",
                "customer_mobile_no":"0948731846",
                "customer_country_code":"Vietnam",
                "customer_email":"kedleyqxmaletu2@hotmail.com",
                "customer_name":"Hoang g13",
                "customer_tel_no":"0948731846",
                "customer_city":"Qu\u1eadn C\u1ea7u Gi\u1ea5y"
                }
            }
        ],
        "status":"0"
    }


    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def hello1(request):
    name = request.body.decode()
    header = request.headers
    # print(header)
    print(str(name))
    result = {"success":"true","message":"successfully.","code":0,"errorCode":"","errorMsg":""}
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def jdtest(request):
    from HelloWorld.public.JD.JD_create import JD_data
    name = request.body.decode()
    print(str(name))
    result = JD_data()
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response



@csrf_exempt
def robot(request):
    from HelloWorld.ICBU.order_inquire import Order_Inquire
    from HelloWorld.ICBU.Icbu_create import Icbu_Create
    from HelloWorld.ICBU.icbu_return import icbu_return
    from HelloWorld.ICBU.notifypaid import notifypaid
    from HelloWorld.public.login import login
    from HelloWorld.public.create import create_order
    from HelloWorld.robot.phone import phone
    from HelloWorld.ICBU.package_scan import package_scan
    from HelloWorld.public.inbound import inbound
    from HelloWorld.public.outbound import outbound
    from HelloWorld.public.close_box import close_box
    from HelloWorld.public.check_weight import check_weight
    from HelloWorld.public.shipment_add import shipment_add
    from HelloWorld.public.shipment_close import shipment_close
    from HelloWorld.public.shipment_num_scan import shipment_scan
    from HelloWorld.ICBU.status import state
    from HelloWorld.public.box_number_find import box_number_find
    from HelloWorld.public.Wish.Wish_Create import Wish_Create
    from HelloWorld.public.Wish.bag_create import bag_creat
    from HelloWorld.public.create_Mawb import create_mawb
    from HelloWorld.public.close_Mawb import  scan_box
    from HelloWorld.public.close_Mawb import close_mawb
    from HelloWorld.public.order_box import order_box
    from HelloWorld.public.box_scan import Box_scan
    from HelloWorld.public.cainiao.CaiNiao import CaiNiao_create

    token=login()
    ruquests = request.body.decode()
    url = json.loads(ruquests)["sessionWebhook"]
    data = json.loads(ruquests)["text"]["content"]
    print(data)
    name = json.loads(ruquests)["senderNick"]
    HEADERS={"Content-Type":"application/json;charset=utf-8"}
    String_textMsg={
        "at": {
                        "atMobiles": [
                            phone(name)
                        ],
                        "isAtAll": False
                    },
                    "msgtype":"text",
                    "text":{"content":"收到指令，异步执行中，稍后将给出结果。"}
    }
    res=requests.post(url,data=json.dumps(String_textMsg),headers=HEADERS)
    if "下个单" in data:
        country = re.findall(r"下个单，目的国代码：(.*)", data)
        response = create_order(token,country[0])
        String_textMsg["text"]["content"] = response
    elif "支付" in data:
        ref_num = re.findall(r"支付(.*)", data)[0]
        response = notifypaid(ref_num)
        String_textMsg["text"]["content"] = response
    elif "退货" in data:
        ref_num = re.findall(r"退货(.*)", data)[0]
        response = icbu_return(ref_num)
        String_textMsg["text"]["content"] = response
    elif "ICBU订单" in data:
        response = Icbu_Create()
        String_textMsg["text"]["content"] = response
    elif "WISH订单" in data:
        order_list=[]
        for i in range(1):
            data = Wish_Create()
            order_list.append(data[0])
        box_num = bag_creat(order_list)
        String_textMsg["text"]["content"] = {"tracking_number":order_list,"box_num":box_num}
    elif "菜鸟订单" in data:
        for i in range(1):
            data = CaiNiao_create()
        String_textMsg["text"]["content"] = data
    elif "揽收" in data:
        ref_num = re.findall(r"揽收(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = package_scan(ref_num)
        else:
            response = package_scan(tracking_number)
        String_textMsg["text"]["content"] = response
    elif "大包收货" in data:
        box_num = re.findall(r"大包收货(.*)", data)[0]
        response = Box_scan(box_num)
        String_textMsg["text"]["content"] = response
    elif "入库" in data:
        ref_num = re.findall(r"入库(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = inbound(ref_num)
        else:
            response = inbound(tracking_number)
        String_textMsg["text"]["content"] = response
    elif "出库" in data:
        ref_num = re.findall(r"出库(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = outbound(ref_num)
            box_num = response
            tra_list = []
            tra_list.append(ref_num)
            response = close_box(box_num,tra_list)
            check_weight(box_num,tra_list)
        else:
            response = outbound(tracking_number)
            box_num = response
            tra_list = []
            tra_list.append(ref_num)
            response = close_box(box_num,tra_list)
            check_weight(box_num,tra_list)
        String_textMsg["text"]["content"] = response
    elif "移交" in data:
        ref_num = re.findall(r"移交(.*)", data)[0]
        box_num = box_number_find(ref_num)
        shipment_num = shipment_add()
        shipment_num_ids = shipment_scan(box_num,shipment_num)
        shipment_close_text = shipment_close(shipment_num_ids,shipment_num)
        String_textMsg["text"]["content"] = shipment_close_text
    elif "干线" in data:
        ref_num = re.findall(r"干线(.*)", data)[0]
        mawb_data = create_mawb()
        box_num = order_box(ref_num)
        if box_num != '订单没有出库':
            scan_box(box_num,mawb_data['mawb'],mawb_data['id'])
            mawb_rep = close_mawb(mawb_data["mawb"],mawb_data["id"])
            String_textMsg["text"]["content"] = mawb_rep
        else:
            String_textMsg["text"]["content"] = box_num
    elif "补录货态" in data:
        ref_num = re.findall(r"补录货态(.+?)，", data)[0]
        statu = re.findall(r"，(.*)", data)[0]
        status_maping = {
                        "FX":"出口清关成功",
                        "OC":"航班起飞",
                        "OF":"航班抵达",
                        "OQ":"⽬的地清关完成",
                        "HL":"到达转运中心",
                        "ZY":"到达转运中心",
                        "IT":"离开转运中⼼",
                        "SP":"安排投递",
                        "RJ":"收件⼈拒绝签收",
                        "OK":"快件已签收",
                        "RN":"包裹退回到发件⼈",
                        "PD":"运输过程中出现异常",
                        "LS":"货物丢失",
                        "XH":"货物销毁",
                        "DM":"货物损坏"}
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = state(ref_num,statu,status_maping[statu])
        else:
            response = state(tracking_number,statu,status_maping[statu])
        String_textMsg["text"]["content"] = response
    else:
        String_textMsg["text"]["content"] = "该功能暂时不支持。"
    requests.post(url,data=json.dumps(String_textMsg),headers=HEADERS)#发送给机器人
    result = {"code":0,"msg":"Success"}
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    return response


@csrf_exempt
def shopee(request):
    name = request.body.decode()
    print(str(name))
    import os
    path = os.getcwd()#获取当前路径
    open(path+"\HelloWorld\logs\log.log",'ab').write(str(name+"\n").encode('utf-8'))
    result = {
                "message": "this is a test message, detail [this is a test detail]",
                "data": {
                "error_list": [{
                    "error_message": "asfdsfsdf",
                    "error_code": "0000",
                    "sls_tn": "sfsdfsdf"
                }]
                },
                "retcode": 1
            }
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def shopee2(request):
    name = request.body.decode()
    print(str(name))
    import os
    path = os.getcwd()#获取当前路径
    open(path+"\HelloWorld\logs\log.log",'ab').write(str(name+"\n").encode('utf-8'))
    result = {
                "message":"this is a test message, detail [this is a test detail]",
                "retcode":1
            }
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def shopee3(request):
    name = request.body.decode()
    print(str(name))
    import os
    path = os.getcwd()#获取当前路径
    open(path+"\HelloWorld\logs\log.log",'ab').write(str(name+"\n").encode('utf-8'))
    result = {
                "message":"this is a test message, detail [this is a test detail]",
                "retcode":1
                }
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response


@csrf_exempt
def WeChat(request):
    from HelloWorld.ICBU.order_inquire import Order_Inquire
    from HelloWorld.ICBU.Icbu_create import Icbu_Create
    from HelloWorld.ICBU.icbu_return import icbu_return
    from HelloWorld.ICBU.notifypaid import notifypaid
    from HelloWorld.public.login import login
    from HelloWorld.public.create import create_order
    from HelloWorld.robot.phone import phone
    from HelloWorld.ICBU.package_scan import package_scan
    from HelloWorld.public.inbound import inbound
    from HelloWorld.public.outbound import outbound
    from HelloWorld.public.close_box import close_box
    from HelloWorld.public.check_weight import check_weight
    from HelloWorld.public.shipment_add import shipment_add
    from HelloWorld.public.shipment_close import shipment_close
    from HelloWorld.public.shipment_num_scan import shipment_scan
    from HelloWorld.ICBU.status import state
    from HelloWorld.public.box_number_find import box_number_find
    from HelloWorld.public.Wish.Wish_Create import Wish_Create
    from HelloWorld.public.Wish.bag_create import bag_creat
    from HelloWorld.public.create_Mawb import create_mawb
    from HelloWorld.public.close_Mawb import  scan_box
    from HelloWorld.public.close_Mawb import close_mawb
    from HelloWorld.public.order_box import order_box
    from HelloWorld.public.box_scan import Box_scan
    from HelloWorld.public.cainiao.CaiNiao import CaiNiao_create

    token=login()
    ruquests = request.body.decode()
    print(request.body)
    url = json.loads(ruquests)["sessionWebhook"]
    data = json.loads(ruquests)["text"]["content"]
    print(data)
    name = json.loads(ruquests)["senderNick"]
    HEADERS={"Content-Type":"application/json;charset=utf-8"}
    String_textMsg={
        "at": {
                        "atMobiles": [
                            phone(name)
                        ],
                        "isAtAll": False
                    },
                    "msgtype":"text",
                    "text":{"content":"收到指令，异步执行中，稍后将给出结果。"}
    }
    res=requests.post(url,data=json.dumps(String_textMsg),headers=HEADERS)
    if "下个单" in data:
        country = re.findall(r"下个单，目的国代码：(.*)", data)
        response = create_order(token,country[0])
        String_textMsg["text"]["content"] = response
    elif "支付" in data:
        ref_num = re.findall(r"支付(.*)", data)[0]
        response = notifypaid(ref_num)
        String_textMsg["text"]["content"] = response
    elif "退货" in data:
        ref_num = re.findall(r"退货(.*)", data)[0]
        response = icbu_return(ref_num)
        String_textMsg["text"]["content"] = response
    elif "ICBU订单" in data:
        response = Icbu_Create()
        String_textMsg["text"]["content"] = response
    elif "WISH订单" in data:
        order_list=[]
        for i in range(1):
            data = Wish_Create()
            order_list.append(data[0])
        box_num = bag_creat(order_list)
        String_textMsg["text"]["content"] = {"tracking_number":order_list,"box_num":box_num}
    elif "菜鸟订单" in data:
        for i in range(1):
            data = CaiNiao_create()
        String_textMsg["text"]["content"] = data
    elif "揽收" in data:
        ref_num = re.findall(r"揽收(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = package_scan(ref_num)
        else:
            response = package_scan(tracking_number)
        String_textMsg["text"]["content"] = response
    elif "大包收货" in data:
        box_num = re.findall(r"大包收货(.*)", data)[0]
        response = Box_scan(box_num)
        String_textMsg["text"]["content"] = response
    elif "入库" in data:
        ref_num = re.findall(r"入库(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = inbound(ref_num)
        else:
            response = inbound(tracking_number)
        String_textMsg["text"]["content"] = response
    elif "出库" in data:
        ref_num = re.findall(r"出库(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = outbound(ref_num)
            box_num = response
            tra_list = []
            tra_list.append(ref_num)
            response = close_box(box_num,tra_list)
            check_weight(box_num,tra_list)
        else:
            response = outbound(tracking_number)
            box_num = response
            tra_list = []
            tra_list.append(ref_num)
            response = close_box(box_num,tra_list)
            check_weight(box_num,tra_list)
        String_textMsg["text"]["content"] = response
    elif "移交" in data:
        ref_num = re.findall(r"移交(.*)", data)[0]
        box_num = box_number_find(ref_num)
        shipment_num = shipment_add()
        shipment_num_ids = shipment_scan(box_num,shipment_num)
        shipment_close_text = shipment_close(shipment_num_ids,shipment_num)
        String_textMsg["text"]["content"] = shipment_close_text
    elif "干线" in data:
        ref_num = re.findall(r"干线(.*)", data)[0]
        mawb_data = create_mawb()
        box_num = order_box(ref_num)
        if box_num != '订单没有出库':
            scan_box(box_num,mawb_data['mawb'],mawb_data['id'])
            mawb_rep = close_mawb(mawb_data["mawb"],mawb_data["id"])
            String_textMsg["text"]["content"] = mawb_rep
        else:
            String_textMsg["text"]["content"] = box_num
    elif "补录货态" in data:
        ref_num = re.findall(r"补录货态(.+?)，", data)[0]
        statu = re.findall(r"，(.*)", data)[0]
        status_maping = {
                        "FX":"出口清关成功",
                        "OC":"航班起飞",
                        "OF":"航班抵达",
                        "OQ":"⽬的地清关完成",
                        "HL":"到达转运中心",
                        "ZY":"到达转运中心",
                        "IT":"离开转运中⼼",
                        "SP":"安排投递",
                        "RJ":"收件⼈拒绝签收",
                        "OK":"快件已签收",
                        "RN":"包裹退回到发件⼈",
                        "PD":"运输过程中出现异常",
                        "LS":"货物丢失",
                        "XH":"货物销毁",
                        "DM":"货物损坏"}
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = state(ref_num,statu,status_maping[statu])
        else:
            response = state(tracking_number,statu,status_maping[statu])
        String_textMsg["text"]["content"] = response
    else:
        String_textMsg["text"]["content"] = "该功能暂时不支持。"
    requests.post(url,data=json.dumps(String_textMsg),headers=HEADERS)#发送给机器人
    result = {"code":0,"msg":"Success"}
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    return response
@csrf_exempt
def cainiao(request):
    name = request.body.decode()
    print(str(name))
    package_number = "BOX" + str((datetime.datetime.now()).strftime('%m%d%H%M'))
    tracking_number = "TRK" + str((datetime.datetime.now()).strftime('%m%d%H%M'))
    result = {
    "results":[
                ],
                "status":"0"
            }
    for i in range(100):
        order = {
                        "shipper":{
                            "shipper_tel_no":"18606902010",
                            "shipper_seller_id":"PH7S32KVH6",
                            "shipper_address1":"China^^^^^^^^^^^^Fujian Province~~~Putian~~~~~~~~~fu jian sheng pu tian shi li cheng qu gong chen jie dao xia dian lu shuang chi qi ye da sha 7lou  · gong chen jie dao ,Fujian Province,Putian,Licheng District",
                            "channel":"LAZADA",
                            "shipper_name":"18606902010",
                            "shipper_city":"Putian",
                            "shipper_country_code":"CN",
                            "shipper_zip_code":"荔城区",
                            "shipper_mall_site":"PH"
                        },
                        "pallet_number":"",
                        "parcel":{
                            "package_number":"",
                            "service_type":"standard",
                            "package_weight_unit":"KG",
                            "total_pieces_in_package":"1",
                            "create_time":"2023-01-10 16:21:41",
                            "package_price_currency":"PHP",
                            "biz_type":"LZD",
                            "package_weight":"0.2440",
                            "packing_type":"",
                            "payment_method":"CashOnDelivery"
                        },
                        "package_material":"E",
                        "package_sequence":"LP00555414481548",
                        "order_number":"593114708956517",
                        "hand_overed_time":"2023-01-15 23:31:11",
                        "bag":{
                            "bag_id":"SZAMNL45-02-BA2301152201-2698SB",
                            "total_packages_in_bag":"58",
                            "bag_net_package_weight":"13.74",
                            "bag_weight":"15.1450",
                            "bag_weight_unit":"KG"
                        },
                        "remark":"",
                        "sort_code":"ABKK07-01",
                        "bag_id":"SZAMNL45-02-BA2301152201-2698SB",
                        "container_number":"",
                        "success":"true",
                        "tracking_number":"NLPHST0024758626",
                        "fmTrackingNumbers":[
                            "LXBPH000114565173"
                        ],
                        "items":[
                            {
                                "pieces":"1",
                                "paid_price":"584.5000",
                                "product_category_name":"Root Category/Toys & Games/Sports Toys & Outdoor Play/Outdoor Toys/Foam Play",
                                "item_desc":"【6 Design Free Bullets Toy】Glock Children Soft Bullet Toy Shoo-ting Toy MAN SOFT BULLET TOY FOR KIDS AND CHILDREN",
                                "hts_code":{
                                    "lazada":[
                                        "91029900"
                                    ]
                                },
                                "import_declaration_value":"568.0000",
                                "unit_price_currency":"PHP",
                                "cod_value":"584.5000",
                                "sku":"3431367582_PH-17590114090",
                                "unit_price":"588.0000",
                                "item_desc_en":"【6 Design Free Bullets Toy】Glock Children Soft Bullet Toy Shoo-ting Toy MAN SOFT BULLET TOY FOR KIDS AND CHILDREN",
                                "product_category_id":"394986"
                            }
                        ],
                        "customer":{
                            "customer_address1":"Albay~~~Daraga~~~~~~Bascaran Brgy. Bascaran, Daraga Albay, Albay, Daraga, Bascaran",
                            "customer_address2":"Albay~~~Daraga~~~~~~Bascaran Brgy. Bascaran, Daraga Albay, Albay, Daraga, Bascaran",
                            "customer_zip_code":"Bascaran",
                            "customer_state":"Daraga",
                            "customer_mobile_no":"09397720577",
                            "customer_country_code":"Philippines",
                            "customer_email":"noel-lozada@yahoo.com",
                            "customer_name":"noel m. lozada",
                            "customer_tel_no":"09397720577",
                            "customer_city":"Daraga"
                        }
                    }
        order['package_sequence'] = tracking_number  + str(i)
        order['order_number'] = tracking_number  + str(i)
        order['tracking_number'] = tracking_number  + str(i)
        order['bag']['bag_id'] =  package_number
        order['bag_id'] =  package_number
        result["results"].append(order)
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response
@csrf_exempt
def status(request):
    name = request.body.decode()
    print(str(name))
    result = [{
                    "response":{
                        "request_action":"StatusUpdate",
                        "request_time":"2023-01-16 18:10:51",
                        "records":{
                            "new":"97",
                            "total":"97"
                        },
                        "success":"true",
                        "request_id":"1673863851"
                    }
                },{
                    "response":{
                        "result_type":"REPEAT_CHECK_DB_ERROR",
                        "request_action":"StatusUpdate",
                        "request_time":"2023-01-16 18:10:28",
                        "records":{
                            "new":"231",
                            "total":"250"
                        },
                        "success":"false",
                        "request_id":"1673863828",
                        "result_reason":"CODE: REPEAT_CHECK_DB_ERROR, MESSAGE: CODE: REPEAT_CHECK_DB_ERROR, MESSAGE: updateFulfillExecuteInfo failed:CODE: , MESSAGE: repeat check insert exception, traceId:21507a6816738638283222677e9094"
                    }
                }
    ]
    response =  HttpResponse(json.dumps(result[random.randint(0,1)]), content_type="application/json")
    response.status_code==200
    return response
@csrf_exempt
def spider(request):
    name = request.body.decode()
    name2 = request.header.decode()
    print(str(name))
    print(str(name2))
    result = {
                    "code":401,
                    "message":"Unauthorized",
                    "tracking_number":"DUMMY19940047781"
                }
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 401)
    return response

@csrf_exempt
def jhy(request):
    name = request.body.decode()
    result = {
    "data":[
                {
                    "shipper_hawbcode":"TESTBACK2023009770",
                    "server_hawbcode":"92055901755477300424021567",
                    "channel_hawbcode":None,
                    "destination_country":"US",
                    "destination_country_name":None,
                    "track_status":"NC",
                    "track_status_name":"清关中",
                    "signatory_name":"",
                    "details":[
                        {
                            "tbs_id":"128102",
                            "track_occur_date":"2023-02-20 08:05:01",
                            "track_location":"test1",
                            "track_description":"Accepted at USPS Regional Origin Facility",
                            "track_description_en":"Accepted at USPS Regional Facility",
                            "track_code":"CP",
                            "track_status":"",
                            "track_status_cnname":"清关中"
                        }
                    ]
                }
            ],
            "success":1,
            "cnmessage":"获取跟踪记录成功",
            "enmessage":"获取跟踪记录成功",
            "order_id":0
        }
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 200)
    return response


@csrf_exempt
def shougao(request):
    name = request.body.decode()
    result = [
                {
                    "data":[
                        {
                            "businessId":"",
                            "businessStatus":"",
                            "business_channeltransfercode":"",
                            "business_customerweightf":"",
                            "business_grossweight":"",
                            "business_pieces":"1",
                            "business_seqinvoicecode":"",
                            "business_serveweightf":"",
                            "childrenTrackDetails":None,
                            "consigneeCountry":"JP",
                            "consignee_address":"",
                            "consignee_name":"",
                            "customer_code":"KERRY",
                            "file_path":"",
                            "order_customnote":"",
                            "productKindName":"日本小包普货",
                            "referenceNumber":"TESTTORI20230224000009",
                            "shipper_name":"",
                            "trackContent":"お荷物を発送しました",
                            "trackDate":"2023-02-24 15:56:02",
                            "trackDetails":[
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"出荷準備中",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:11:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"到达收货点",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:12:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"不在",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:13:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"货物电子信息已经收到",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:14:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"↓配達中",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:15:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"↓輸送中",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:16:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"↓集荷",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:17:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"1個",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:18:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"現地に到着/通関中",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:19:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                },
                                {
                                    "business_id":"",
                                    "country_code":"",
                                    "system_id":"",
                                    "track_content":"経由地を出発",
                                    "track_createdate":"",
                                    "track_date":"2023-02-28 19:20:02",
                                    "track_id":"",
                                    "track_kind":"",
                                    "track_location":"",
                                    "track_signdate":"",
                                    "track_signperson":"",
                                    "track_substate":""
                                }
                            ],
                            "trackLocation":"",
                            "trackSignperson":"",
                            "trackingNumber":"SGD00006232"
                        }
                    ],
                    "ack":"true"
                }
            ]
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 200)
    return response



@csrf_exempt
def quadpro(request):
    name = request.body.decode()
    result ={
    "status":"Partial Success",
    "errors":[
                    {
                        "code":950005,
                        "message":"Order 4006318030081398 not found trackingevent."
                    }
                ],
                "data":[
                    {
                        "orderId":"4006318030066357",
                        "status":"Success",
                        "errors":None,
                        "events":[
                            {
                                "trackingNo":"4006318030066357",
                                "eventTime":"2020-08-31T17:17:00",
                                "eventCode":"CCD",
                                "activity":"EXPORT CUSTOMS CLEARED",
                                "location":"",
                                "referenceTrackingNo":None,
                                "destCountry":"CA",
                                "country":"CN",
                                "timeZone":"PST: -09:00"
                            },
                            {
                                "trackingNo":"4006318030066357",
                                "eventTime":"2020-08-19T16:42:00",
                                "eventCode":"DBC",
                                "activity":"DESTRUCTION BY CUSTOMS",
                                "location":"SHANGHAI",
                                "referenceTrackingNo":None,
                                "destCountry":"CA",
                                "country":"CN",
                                "timeZone":"GMT+08:00"
                            },
                            {
                                "trackingNo":"4006318030066357",
                                "eventTime":"2020-08-11T12:48:43",
                                "eventCode":"SCN",
                                "activity":"ITEM DESPATCHED TO TRANSSHIPMENT HUB",
                                "location":"Shenzhen",
                                "referenceTrackingNo":None,
                                "destCountry":"CA",
                                "country":"CN",
                                "timeZone":"EST: -06:00"
                            },
                            {
                                "trackingNo":"4006318030066357",
                                "eventTime":"2020-08-11T11:46:55",
                                "eventCode":"RCV",
                                "activity":"RECEIVED SHIPMENT",
                                "location":"SHANGHAI",
                                "referenceTrackingNo":None,
                                "destCountry":"CA",
                                "country":"CN",
                                "timeZone":"UCT: +02:00"
                            },{
                                "trackingNo":"4006318030066357",
                                "eventTime":"2020-08-11T10:46:55",
                                "eventCode":"RCV",
                                "activity":"ITEM IN TRANSIT",
                                "location":"SHANGHAI",
                                "referenceTrackingNo":None,
                                "destCountry":"CA",
                                "country":"CN",
                                "timeZone":""
                            },{
                                "trackingNo":"4006318030066357",
                                "eventTime":"2020-08-11T10:46:59",
                                "eventCode":"RCV",
                                "activity":"iten in transit",
                                "location":"SHANGHAI",
                                "referenceTrackingNo":None,
                                "destCountry":"CA",
                                "country":"CN",
                                "timeZone":""
                            }
                        ]
                    },
                    {
                        "orderId":"4006318030081398",
                        "status":"Failure",
                        "errors":[
                            {
                                "code":950005,
                                "message":"Order 4006318030081398 not found trackingevent."
                            }
                        ],
                        "events":None
                    }
                ]
            }
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 200)
    return response

@csrf_exempt
def hermes(request):
    name = request.body.decode()
    result = [ {
              "dateTime" : "2023-04-06T02:30:03Z",
              "location" : {
                "latitude" : 51.6134685166667,
                "longitude" : -0.0446517166666667
              },
              "links" : [ ],
              "trackingPoint" : {
                "description" : "Parcel processed at the hub",
                "trackingPointId" : "12319"
              }
            },
    {
              "dateTime" : "2023-04-06T02:35:03Z",
              "location" : {
                "latitude" : 51.6134685166667,
                "longitude" : -0.0446517166666667
              },
              "links" : [ ],
              "trackingPoint" : {
                "description" : "This parcel has been delivered",
                "trackingPointId" : "4041"
              }
                    },{
          "dateTime" : "2023-03-24T03:58:28Z",
          "links" : [ ],
          "trackingPoint" : {
            "description" : "We have received the details for this parcel and expect it to reach the Evri network shortly",
            "trackingPointId" : "1012"
          }
        }]
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 200)
    return response


@csrf_exempt
def status_spider(request):
    name = request.body.decode()
    print(str(name))
    result = {"code":0,"data":{"accepted":[{"origin":2,"number":"H1023130065681801070","email":None,"lang":None,"carrier":100331}],"rejected":[]}}
    response =  HttpResponse(json.dumps(result), content_type="application/xml",status = 429)
    return response

order_sn = "backtest2342342123334234"
@csrf_exempt
def get_order_list(request):
    name = request.body.decode()
    print(str(name))
    result = {
              "error": "",
              "message": "",
              "response": {
                "more": False,
                "next_cursor": "",
                "order_list": [
                  {
                    "order_sn": order_sn
                  },
                  {
                    "order_sn": "230510B0HE09P6"
                  }
                ]
              },
              "request_id": "e354b39f41ff7cbecec4d3c91237178b631"
            }
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 429)
    return response

@csrf_exempt
def get_order_detail(request):
    name = request.body.decode()
    print(str(name))
    result = {
              "error": "",
              "message": "",
              "response": {

                "order_list": [
                  {
              "actual_shipping_fee": 0,
              "actual_shipping_fee_confirmed": False,
              "buyer_cancel_reason": "",
              "buyer_user_id": 774569250,
              "buyer_username": "q2efl8i_hc",
              "cancel_by": "",
              "cancel_reason": "",
              "checkout_shipping_carrier": "Standard Delivery - ส่งธรรมดาในประเทศ",
              "cod": False,
              "create_time": 1662619882,
              "currency": "THB",
              "days_to_ship": 2,
              "dropshipper": "",
              "dropshipper_phone": "",
              "estimated_shipping_fee": 45,
              "fulfillment_flag": "fulfilled_by_local_seller",
              "goods_to_declare": False,
              "item_list": [
                {
                  "item_id": 20340845789,
                  "item_name": "GAEFUIY เก้าอี้ทํางาน เก้าอี้สํานักงาน เก้าอี้ nubwo การยศาสตร์ ขาไนล่อน เบาะฟองน้ำ ที่พักแขนปรับขึ้น office chair 2203",
                  "item_sku": "",
                  "model_id": 126677868820,
                  "model_name": "สีขาว&สีดำ.",
                  "model_sku": "W00600",
                  "model_quantity_purchased": 1,
                  "model_original_price": 500,
                  "model_discounted_price": 100,
                  "wholesale": False,
                  "weight": 0.63,
                  "add_on_deal": False,
                  "main_item": False,
                  "add_on_deal_id": 0,
                  "promotion_type": "",
                  "promotion_id": 0,
                  "order_item_id": 20340845789,
                  "promotion_group_id": 0,
                  "image_info": {
                    "image_url": "https://cf.shopee.co.th/file/96e7ed3c39df6c6e14ff6304fd169d4e_tn"
                  },
                  "product_location_id": [
                    "THZ"
                  ]
                }
              ],
              "message_to_seller": "",
              "note": "",
              "note_update_time": 0,
              "order_chargeable_weight_gram": 0,
              "order_sn": "220908992312323FTG",
              "order_status": "SHIPPED",
              "package_list": [
                {
                  "package_number": "OFG116319082204980",
                  "logistics_status": "LOGISTICS_PICKUP_DONE",
                  "shipping_carrier": "J&T Express",
                  "parcel_chargeable_weight_gram": 0,
                  "item_list": [
                    {
                      "item_id": 20340845789,
                      "model_id": 126677868820
                    }
                  ]
                }
              ],
              "pay_time": 1662622110,
              "payment_method": "Online Payment",
              "pickup_done_time": 1662633564,
              "recipient_address": {
                "name": "ค******ำ",
                "phone": "******25",
                "town": "",
                "district": "",
                "city": "อำเภอดอยสะเก็ด",
                "state": "จังหวัดเชียงใหม่",
                "region": "TH",
                "zipcode": "50220",
                "full_address": "******ด จ. เชียงใหม่ 50220 (โรงพยาบาลดอยสะเก็ด )(ห้องจ่ายยา) อำเภอดอยสะเก็ด จังหวัดเชียงใหม่ 50220"
              },
              "region": "TH",
              "reverse_shipping_fee": 0,
              "ship_by_date": 1662794910,
              "shipping_carrier": "J&T Express",
              "split_up": False,
              "total_amount": 145,
              "update_time": 1662633564
            }
                ]
              },
              "request_id": "e354b39f41ff7cbecec4d3c97178b631"
            }

    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 429)
    return response

@csrf_exempt
def ship_order(request):
    name = request.body.decode()
    print(str(name))
    result = {
          "error": "",
          "message": "",
          "request_id": "e354b39f41ff7cbecec4d3c97178b631"
        }
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 429)
    return response

@csrf_exempt
def get_shipping_parameter(request):
    name = request.body.decode()
    print(str(name))
    result = {
                "error":"",
                "message":"",
                "response":{
                    "info_needed":{
                        "pickup":[
                            "address_id",
                            "pickup_time_id"
                        ]
                    },
                    "pickup":{
                        "address_list":[
                            {
                                "address_id":69206361,
                                "region":"MY",
                                "state":"Selangor",
                                "city":"Klang",
                                "district":"Klang",
                                "town":"Port Klang",
                                "address":"No. 27, Jalan TS 6/8, Taman Perindustrian Subang, \n47500 Subang Jaya, Selangor.  \n0122606445\nElaine",
                                "zipcode":"42000",
                                "address_flag":[
                                    "default_address",
                                    "pickup_address",
                                    "return_address"
                                ],
                                "time_slot_list":[
                                    {
                                        "date":1683532800,
                                        "pickup_time_id":"1683532800"
                                    },
                                    {
                                        "date":1683619200,
                                        "pickup_time_id":"1683619200"
                                    },
                                    {
                                        "date":1683705600,
                                        "pickup_time_id":"1683705600"
                                    },
                                    {
                                        "date":1683792000,
                                        "pickup_time_id":"1683792000"
                                    },
                                    {
                                        "date":1683878400,
                                        "pickup_time_id":"1683878400"
                                    },
                                    {
                                        "date":1683964800,
                                        "pickup_time_id":"1683964800"
                                    },
                                    {
                                        "date":1684137600,
                                        "pickup_time_id":"1684137600"
                                    },
                                    {
                                        "date":1684224000,
                                        "pickup_time_id":"1684224000"
                                    },
                                    {
                                        "date":1684310400,
                                        "pickup_time_id":"1684310400"
                                    },
                                    {
                                        "date":1684396800,
                                        "pickup_time_id":"1684396800"
                                    },
                                    {
                                        "date":1684483200,
                                        "pickup_time_id":"1684483200"
                                    },
                                    {
                                        "date":1684569600,
                                        "pickup_time_id":"1684569600"
                                    },
                                    {
                                        "date":1684742400,
                                        "pickup_time_id":"1684742400"
                                    },
                                    {
                                        "date":1684828800,
                                        "pickup_time_id":"1684828800"
                                    },
                                    {
                                        "date":1684915200,
                                        "pickup_time_id":"1684915200"
                                    },
                                    {
                                        "date":1685001600,
                                        "pickup_time_id":"1685001600"
                                    },
                                    {
                                        "date":1685088000,
                                        "pickup_time_id":"1685088000"
                                    },
                                    {
                                        "date":1685174400,
                                        "pickup_time_id":"1685174400"
                                    },
                                    {
                                        "date":1685347200,
                                        "pickup_time_id":"1685347200"
                                    },
                                    {
                                        "date":1685433600,
                                        "pickup_time_id":"1685433600"
                                    },
                                    {
                                        "date":1685520000,
                                        "pickup_time_id":"1685520000"
                                    },
                                    {
                                        "date":1685606400,
                                        "pickup_time_id":"1685606400"
                                    },
                                    {
                                        "date":1685692800,
                                        "pickup_time_id":"1685692800"
                                    },
                                    {
                                        "date":1685779200,
                                        "pickup_time_id":"1685779200"
                                    },
                                    {
                                        "date":1686038400,
                                        "pickup_time_id":"1686038400"
                                    },
                                    {
                                        "date":1686124800,
                                        "pickup_time_id":"1686124800"
                                    },
                                    {
                                        "date":1686211200,
                                        "pickup_time_id":"1686211200"
                                    },
                                    {
                                        "date":1686297600,
                                        "pickup_time_id":"1686297600"
                                    },
                                    {
                                        "date":1686384000,
                                        "pickup_time_id":"1686384000"
                                    },
                                    {
                                        "date":1686556800,
                                        "pickup_time_id":"1686556800"
                                    },
                                    {
                                        "date":1686643200,
                                        "pickup_time_id":"1686643200"
                                    },
                                    {
                                        "date":1686729600,
                                        "pickup_time_id":"1686729600"
                                    },
                                    {
                                        "date":1686816000,
                                        "pickup_time_id":"1686816000"
                                    },
                                    {
                                        "date":1686902400,
                                        "pickup_time_id":"1686902400"
                                    },
                                    {
                                        "date":1686988800,
                                        "pickup_time_id":"1686988800"
                                    },
                                    {
                                        "date":1687161600,
                                        "pickup_time_id":"1687161600"
                                    }
                                ]
                            }
                        ]
                    }
                },
                "request_id":"3de7e6695ea9c89b51231b6d9bab882d9f20"
            }
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 429)
    return response


@csrf_exempt
def shaoke(request):
    name = request.body.decode()
    result ={
        "code":200,
        "message":"Success",
        "data":[
            {
                "status":1,
                "desc_code":"OB",
                "desc":"Delivery interru1pted",
                "location":"DE",
                "update_time":"2023-07-20 16:18:01"
            },
            {
                "status":None,
                "desc_code":"OA",
                "desc":"Returned to the sen121der",
                "location":"",
                "update_time":"2023-07-20 16:18:03"
            }
        ]
    }
    response =  HttpResponse(json.dumps(result), content_type="application/json",status = 200)
    return response




