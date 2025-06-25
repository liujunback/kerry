import json
import random
from time import sleep

import requests

from case.public.Hanover_Scan import HandOver_cerate, HandOver_boxid, HandOver_close
from case.public.login import login
from case.public.order import order
from case.public.timesCBS import close_mawb, CBS_create_mawb


def sort_in(list):
    token=login()
    array=[]
    for i in range(list):#订单个数
        tracking_number=order(token)
        array.append(tracking_number)
        token2={
            'Content-Type':'application/json',
            "token":"9284fcd5ae33b496c0405d8a832f6017a42b1a59" }
        param={
                "ticketsNum":tracking_number,
                "weight":"10",
                "vol":"",
                "height":"",
                "length":"",
                "width":"",
                "workConsole":"001"
            }
        r1=requests.post("http://stg.timespss.com/api/ops/PostWayBillInfo",data=json.dumps(param),headers=token2)
        print(r1.text)
    token2={
        'Content-Type':'application/json',
        "token":"9284fcd5ae33b496c0405d8a832f6017a42b1a59" }
    param={
                "sortCode":"ESin01",
                "portCode":"",
                "waybillInfos":array
            }

    r2=requests.post("http://stg.timespss.com/api/ops/PostPackageInfo",data=json.dumps(param),headers=token2)
    #print(json.loads(r2.text)["pdfContent"])
    print(r2.text)
    boxid=json.loads(r2.text)["packageNo"]
    # handover_number=HandOver_cerate()
    # HandOver_boxid(boxid,handover_number)
    # HandOver_close(handover_number)
    # mawb=CBS_create_mawb(boxid)
    # sleep(3)
    # close_mawb(mawb)

sort_in(3)