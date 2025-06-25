import json
import random
import urllib

import requests

from TMS.cainiao.CaiNiaoSign import CaiNiaoSign


def create():
    ref_num = "LP004577"+str(random.randint(15465585,95465585))
    tra_num = "6359000020378" + str(random.randint(1501828261,9501828261))
    print(tra_num)
    print(ref_num)
    request_data ={"preCPResCode":"TRUNK_30321644","parcel":{"priceUnit":"CENT","parcelQuantity":"148","priceCurrency":"USD","price":"1155","bigBagWeightUnit":"g","bigBagID":"KP0000038011","goodsList":[{"priceUnit":"CENT","quantity":"1","productID":"1005002238046619","weight":"74","declarePrice":"1155","categoryName":"Accessories","categoryCNName":"电子设备","url":"http://www.aliexpress.com/item//1005002238046619.html","categoryFeature":"00","productCategory":"Consumer Electronics|Games & Accessories|Accessories","priceCurrency":"USD","cnName":"电子设备","hsCode":"8470290000","price":"1155","name":"Electronic equipment","itemPrice":"0","suggestedENName":"repair tool","suggestedCNName":"3D操纵杆","categoryID":"200005123","weightUnit":"g"}],"weight":"92","bigBagWeight":"15030","suggestedWeight":"74","weightUnit":"g"},"outboundTime":"2021-07-19 16:27:36","interCPResCode":"DISTRIBUTOR_30310151","bizType":"AE_4PL_STANDARD","receiver":{"zipCode":"2825-839","address":{"country":"PT","province":"Setubal","city":"Trafaria","district":"","detailAddress":"Rua de Sao Pedro n28"},"areaId":"168","phone":"916192686","name":"Diogo Rocha","mobile":"916192686","imID":"pt1160517238eswm","email":"diogorochad@hotmail.com"},"currentCPResCode":"DISTRIBUTOR_30310151","laneCode":"L-AE_STANDARD_SINOTRANS_CORREIOEXPRESS","logisticsOrderCode":ref_num,"routingTrial":"1","insuranceInfo":{},"trade":{"priceUnit":"CENT","priceCurrency":"USD","price":"1114","purchaseTime":"2021-07-16 20:00:27","tradeID":"8135359526779030"},"sender":{"zipCode":"201411","address":{"country":"China","province":"shang hai","city":"shang hai shi","district":"feng xian qu","detailAddress":"feng cheng zhen~~~3rd Floor, Building 7, No. 669 Nanfeng Road"},"phone":"18982577513","name":"Hu Changjian","storeName":"3C-World Fun Store","imID":"cn1533780312jxts"},"cloudPrintData":"{\"encryptedData\":\"AES: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\",\"signature\":\"MD:hxzI5Q7BcLAwWPyVIyFzkA==\",\"templateURL\":\"http://cloudprint.cainiao.com/cloudprint/template/getStandardTemplate.json?template_id=364421\",\"ver\":\"\"}","customs":{"declarePriceTotal":"1155"},"trackingNumber":tra_num,"returnParcel":{"undeliverableOption":"1","zipCode":"201411","address":{"country":"中国","province":"上海","city":"上海市","district":"奉贤区","detailAddress":"奉城镇~~~南奉公路669号7号楼304"},"phone":"18982577513","name":"胡昌建","imID":"cn1533780312jxts","email":"799029125@qq.com"},"nextCPResCode":""}
    sign = CaiNiaoSign(request_data)

    url = "http://stg.timesoms.com/api/cainiao/shipment/create?product_code=CACNPTKPE"

    payload={'data_digest': str(sign),
    'msg_type': '12',
    'logistics_interface': json.dumps(request_data,ensure_ascii=False,separators=(',',':')),
    'partner_code': '123',
    'from_code': '123',
    'msg_id': '123'}
    files=[

    ]
    headers = {}

    response = requests.request("POST", url, headers=headers, data=payload, files=files)

    print(response.text)
    return tra_num


