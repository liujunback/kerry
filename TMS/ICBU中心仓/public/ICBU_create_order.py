#coding:utf-8

import json
import random

import requests


def create_order_icbu():
    url = "http://120.24.31.239:20000//tms-saas-web/order/booking"
    aliOrderNo = "ALS2023"+str(random.randint(1000000,99999999))
    payload={
        "bookingOrderDTO": "{\"aliOrderNo\":\""+aliOrderNo+"\",\"consignee\":{\"city\":\"Din Daeng\",\"countryCode\":\"TH\",\"email\":\"158@qq.com\",\"mobile\":\"0802135710\",\"name1\":\"Kunakorn Tessana\",\"name2\":\"Kunakorn Tessana\",\"postalCode\":\"10400\",\"stateRegionCode\":\"Bangkok\",\"street1\":\"155 Soi Talat Si Thongkham\",\"street2\":\"testm\"},\"consignor\":{\"city\":\"盐城市\",\"countryCode\":\"CN\",\"email\":\"kiki@139med.com\",\"mobile\":\"19962329110\",\"name1\":\"李艳红\",\"name2\":\"江苏壹叁玖医疗器械有限公司\",\"postalCode\":\"224001\",\"stateRegionCode\":\"江苏省\",\"street1\":\"江苏盐城钱江财富大厦东区B 座盐度水韵1501\",\"street2\":\"testm\"},\"customsDeclaration\":{\"currencyCode\":\"usd\",\"declarationType\":\"QT\",\"totalAmount\":100.000},\"deliveryPriority\":\"TA\",\"extInfo\":\"{\\\"placeOrderTime\\\":\\\"2021-08-26 21:02:02\\\"}\",\"needInsurance\":false,\"needPickUp\":false,\"packages\":[{\"height\":42,\"length\":55,\"packageType\":\"BOX\",\"quantity\":1,\"unit\":\"CM\",\"weight\":14,\"weightUnit\":\"KG\",\"width\":42}],\"products\":[{\"declarationPrice\":0.04,\"hasBattery\":false,\"hsCode\":\"6307900010\",\"material\":\"meltblow\",\"productName\":\"一次性非医用口罩\",\"productNameEn\":\"Disposable non medical mask \",\"productQuantity\":2500,\"productType\":[{\"children\":[],\"code\":\"general\",\"name\":\"普货\"}],\"productUnit\":\"pcs\",\"purpose\":\"防尘\"}],\"referenceNo\":\"DPK200076912048\",\"remarks\":\"此订单选择平台上门揽收服务\",\"serviceCode\":\"ZXC666\",\"warehouse\":{\"code\":\"ASP_FAR_YWC\",\"name\":\"中心仓\"}}",
        "sign": "302c02146459c9448327cb8bc8d4229f6b93e46b617da05e02145f1c69204f196d0159939bb3d97caedba9cd1c66"
    }

    headers = {
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["isSuccess"] != True:
        print(response.text)
    else:
        print(aliOrderNo)
        return aliOrderNo
