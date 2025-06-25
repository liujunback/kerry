import json

import re
import requests
import json
from time import sleep
#pss接口
from case.public.pdf import pdf

#------------------------------------------------------------------------------------------------------pss客户端--------------------------------------------------------------------------------
def client_login():#pss_client登录
	r1=requests.post('http://stg.timespss.com/client-api/auth/login?username=back&password=123456')
	# print("pss_client："+r1.text)
	return json.loads(r1.text)["token"]


def client_sort_in(token,tracking_number):#入库
    sleep(1)
    r2=requests.post("http://stg.timespss.com/client-api/operation/scan_in?tracking_number="+tracking_number+"&tracking_number_type=tracking_number&weight=0.11&length=12&width=12&height=12&mode=NORMAL&is_required_volume=1&token="+token+"&client_version=3.6.10")
    #list1=json.loads(r2.text)["documents"][0]["url"]
    #pdf(list1,tracking_number)#保存面单
    #print("订单面单："+json.loads(r2.text)["documents"][0]["url"])
    print("scan_in"+r2.text)
    # if "SUCCESS" not in r2.text:
    #     r2=requests.post("http://stg.timespss.com/client-api/operation/scan_in?tracking_number="+tracking_number+"&tracking_number_type=tracking_number&weight=0.11&length=12&width=12&height=12&mode=NORMAL&is_required_volume=1&token="+token+"&client_version=3.6.10")
    #     print("scan_in"+r2.text)


#client_sort_in("4da568d55b37ea031922fc50c2d44783e3ef6fd8","KECTH00001338")


def client_sort_out(token,tracking_number):#出库
    r3=requests.post("http://stg.timespss.com/client-api/operation/scan_out?tracking_number="+tracking_number+"&token="+token+"&tracking_number_type=tracking_number")
    print("sort_out："+r3.text)
    if "boxid" not in json.loads(r3.text):
        r3=requests.post("http://stg.timespss.com/client-api/operation/scan_out?tracking_number="+tracking_number+"&token="+token)
        print(r3.text)
        return "123"
    else:
        return json.loads(r3.text)["boxid"]




def client_close_box(token,boxid):#关闭箱子
    r4=requests.post("http://stg.timespss.com/client-api/operation/close_box?boxid="+boxid+"&token="+token)
    print("close_box："+r4.text)
    if "SUCCESS" not in r4.text:
        sleep(1)
        r4=requests.post("http://stg.timespss.com/client-api/operation/close_box?boxid="+boxid+"&token="+token)
        print("close"+r4.text)
    # r5=requests.post("http://stg.timespss.com/client-api/operation/scan_box_weight?boxid="+boxid+"&weight=2.11&boxType=s&boxLength&boxWidth&boxHeight&boxSelfWeight&token=589eb15876637ca6ad78fb7bfacac4749700499d&client_version=3.6.8")
    # print("scan_box_weight"+r5.text)
    print(json.loads(r4.text)["boxid"])
    #print("箱子面单："+json.loads(r4.text)["documents"][0]["url"])
    #return json.loads(r4.text)["boxid"]
#client_sort_in("272cc9bb6898e6093cc9a6b61152b16659701599","KECTH00001050")



