import json

import requests
from TMS.channel_code.public.TMS_login import login


def add_hubout(name,country):

    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/bas/hubout/add"

    payload = {
                "isusing":"1",
                "localDeliveryService":"0",
                "code":name,
                "name":name + "测试路线",
                "businessType":"301",
                "businessTypeName":"快递业务",
                "categoryType":"",
                "quoteRemoteType":"",
                "hubType":country,
                "hubTypeName":country,
                "hubDl":"",
                "deliStatId":"1",
                "deliStatName":"总部",
                "transferStatId":"",
                "transferStatName":"",
                "divSize":"5000",
                "numberRuleId":"",
                "lableTemplateId":"",
                "userId":"",
                "userName":"",
                "statIdStr":"",
                "companyIdStrArr":"",
                "remark":"",
                "limitType":"",
                "goodsTypeArr":"",
                "goodsTypeStr":"",
                "shareType":"2",
                "shareTypeName":"共享给所有",
                "belongStatId":"1199",
                "belongStatName":"",
                "createUserName":"",
                "createDatetime":"",
                "companyId":"",
                "ediId":"",
                "ediConfigName":"",
                "ediIdOther":"",
                "ediConfigNameOther":"",
                "accountDl":"",
                "transportType":"",
                "routeTypeList":"",
                "settlementNode":"",
                "startWeig":"0",
                "endWeig":"0",
                "startPcs":"0",
                "endPcs":"0",
                "cocustomType":"",
                "islimit":"0",
                "radio":"",
                "totalWeig":"0",
                "warehouseZoningRulesType":"",
                "mainTable":[

                ],
                "totalPcs":"0",
                "dateType":"",
                "startDate":"",
                "overPrice":"0",
                "discountPrice":"0",
                "specialBillingRulesList":[

                ],
                "token":login()

            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    print("走货路线创建："+json.loads(response.text)["message"])


def select_hubOutId(name):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/bas/hubout/transfer/list?tableName=bas_hub_out&token="+login()
    response = requests.request("GET", url = url)
    for i in json.loads(response.text)["body"]:
        if i["code"]==name :
            print("走货路线ID：" + str(i["id"]))
            return i["id"]
    print("找不到走货路线")

# add_hubout("CACNESMCR-CORREOS","ES")