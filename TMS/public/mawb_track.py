import json
import requests

from TMS.public.TMS_Login import login


token=login()
def select_mawb_id(mawb):


    url = "http://120.24.31.239:20000/tms-saas-web/tms/oawbtrack/list?sendDatetime=&scanId=&outStatId=&deliStatId=&isabnormal=0&isHasOawbShip=1&hubOutId=&no="+mawb+"&noType=8&destCode=&transportType=&pageSize=50&currentPage=1&token="+token
    payload={}
    headers = {}
    response = requests.request("GET", url, headers=headers, data=payload)

    return json.loads(response.text)["body"]["list"][0]["id"]


def mawb_track(mawb):
    id =select_mawb_id(mawb)
    print(id)
    url = "http://120.24.31.239:20000/tms-saas-web/tms/oawbtrack/add2"
    payload={

                "oldformStr":[
                            {
                                "id":None,
                                "apiCode":"linehaul_pickup",
                                "scanCode":"DT",
                                "scanCodeName":"Linehaul pickup",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"export_customs_clearance_success",
                                "scanCode":"FX",
                                "scanCodeName":"Export Custom Cleared",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"air_freight_uplift",
                                "scanCode":"OC",
                                "scanCodeName":"air_freight_uplift",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"air_freight_arrived",
                                "scanCode":"OF",
                                "scanCodeName":"air_freight_arrived",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"import_customs_clearance_success",
                                "scanCode":"OQ",
                                "scanCodeName":"Successful import clearance",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"import_customs_handover_to_lastmile",
                                "scanCode":"HL",
                                "scanCodeName":"Handover to Lastmile",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            }
                        ],
                "newFormStr":[
                            {
                                "id":None,
                                "apiCode":"linehaul_pickup",
                                "scanCode":"DT",
                                "scanCodeName":"Linehaul pickup",
                                "scanDatetime":"2021-11-22 11:19:20",
                                "scanStation":"CN",
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"export_customs_clearance_success",
                                "scanCode":"FX",
                                "scanCodeName":"Export Custom Cleared",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"air_freight_uplift",
                                "scanCode":"OC",
                                "scanCodeName":"air_freight_uplift",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"air_freight_arrived",
                                "scanCode":"OF",
                                "scanCodeName":"air_freight_arrived",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"import_customs_clearance_success",
                                "scanCode":"OQ",
                                "scanCodeName":"Successful import clearance",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            },
                            {
                                "id":None,
                                "apiCode":"import_customs_handover_to_lastmile",
                                "scanCode":"HL",
                                "scanCodeName":"Handover to Lastmile",
                                "scanDatetime":None,
                                "scanStation":None,
                                "remark":None
                            }
                        ],
                "idList":3239,
                "token":token
            }
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    print(response.text)
mawb_track("TESTBACK20211122101803")