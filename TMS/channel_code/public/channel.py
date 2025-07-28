import json

import requests
from TMS.channel_code.public.TMS_login import login




def add_channel(name,country):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/bas/hubin/add"
    payload = {
                "quotationSegment":"1",
                "isconsomode":"0",
                "isintax":"0",
                "iscod":"0",
                "isopentoxj":"0",
                "categoryType":"",
                "isbj":"2",
                "isusing":"1",
                "localDeliveryService":"0",
                "code":name,
                "name":name + "测试路线",
                "businessType":"301",
                "businessTypeName":"快递业务",
                "hubType":country,
                "hubTypeName":country,
                "divSize":"5000",
                "carryRuleId":"47",
                "flipRuleId":"238",
                "carryRuleJfwId":"47",
                "remark":"",
                "nameEn":"",
                "nameCn":"",
                "destId":"",
                "goodsTypeArr":"",
                "shareType":"2",
                "shareTypeName":"共享给所有",
                "hubOutIdStrArr":"",
                "companyIdStrArr":"",
                "statIdStr":"",
                "statNameStr":"",
                "hubOutIdStr":"",
                "destAreaId":"",
                "belongStatId":"1199",
                "withStatName":"虎门分拨",
                "belongStatName":"",
                "hubOutNameStr":"",
                "destzoneName":"",
                "zipCodeType":"",
                "sortCodeRule01":"",
                "sortCodeRule02":"1",
                "sortCodeRule03":"",
                "sortCodeRule04":"2",
                "sortCodeRule05":"",
                "sortCodeRule06":"",
                "transportType":"",
                "withStatId":"1199",
                "startPcs":"0",
                "endPcs":"0",
                "startWeig":"0",
                "endWeig":"0",
                "sort":"0",
                "startActual":"0",
                "endActual":"0",
                "startVol":"0",
                "endVol":"0",
                "addressScore":"",
                "ediId":"",
                "goodsTypeDefault":"",
                "custAccountListStr":[

                ],
                "custAccountDeleteListStr":"",
                "labelFormat":"",
                "labelCopies":"1",
                "noRuleCode":"",
                "a4Format":"",
                "a4Copies":"1",
                "postClient":"",
                "invoiceFormat":"",
                "invoiceCopies":"1",
                "postName":"",
                "declareInfo":"",
                "rmCountryCode":"",
                "rmCountryName":"",
                "rmName":"",
                "rmTel":"",
                "rmZip":"",
                "rmAddr":"",
                "rmState":"",
                "rmCity":"",
                "countryLabelListStr":[

                ],
                "countryLabelDeleteListStr":"",
                "transferOrderGetType":"",
                "quoteRemoteType":"",
                "startPlaceType":"1",
                "endAuto":"",
                "allEndAuto":"",
                "signStatus":"",
                "failureStatus":"",
                "unfinishStatus":"",
                "hubInSpecialCustWeigRuleListStr":"",
                "goodsTypeStr":"",
                "companyNo":"KERRYCN",
                "token":login()
            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    print("指定路线创建："+json.loads(response.text)["message"])



def select_hubInId(name):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/bas/hubin/transfer/list?tableName=bas_hub_in_name&token="+login()
    response = requests.request("GET", url = url)
    for i in json.loads(response.text)["body"]:
        if i["code"]==name :
            print("指定路线ID：" + str(i["id"]))
            return i["id"]
    print("找不到指定路线")
# add_channel("CACNESMCR-TEST","ES")