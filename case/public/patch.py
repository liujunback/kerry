import json

import requests


#oms直接修改状态

#patch("KECTH00000738","")
import time
#----------------------------------------------------------------------------大箱入库关箱-----------------------------------------------------------------------------

def sort_in(tracking_number,status):#入库
    header2={"Authorization": "Bearer TLnrQjh0w1nZRv41UFEQXOuY0NgoIufTaEPagPqPNqNuSZF3o0AJGPFa56mt"}
    datetime=time.strftime('%Y-%m-%d %H:%M:%S ',time.localtime(time.time()))
    ur="http://stg.timesoms.com/api/orders/"+tracking_number+"?type=milestone&"+status+"="+datetime+"&actual_weight=0.116&order_sent="+datetime+"&sort_code=KM_ES14_01&cancel_box=1?"
    r3=requests.patch(url=ur,headers=header2)
    print("状态："+r3.text)



def sort_out(tracking_number,status,boxid):#获取盒子和关闭
    header2={"Authorization": "Bearer TLnrQjh0w1nZRv41UFEQXOuY0NgoIufTaEPagPqPNqNuSZF3o0AJGPFa56mt"}
    datetime=time.strftime('%Y-%m-%d %H:%M:%S ',time.localtime(time.time()))
    ur="http://stg.timesoms.com/api/orders/"+tracking_number+"?type=milestone&"+status+"="+datetime+"&actual_weight=0.116&sort_code=KM_ES14_01&boxid="+boxid
    r3=requests.patch(url=ur,headers=header2)
    print("状态："+r3.text)
