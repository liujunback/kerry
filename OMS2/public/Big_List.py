import json
import random

import time

import requests

ops_Url="http://47.119.120.7:8000"


class BOX:
    def date(pakege_list_num):
        date={"bag_id":"","bag_weight":"123","bag_length":"312","bag_width":10,"bag_height":2}
        date["bag_id"]="TESTBACK1102"+str(random.randint(1000,999999))
        x=[]
        for i in range(pakege_list_num):
            with open("../data/order_data.txt", 'r',encoding= 'utf-8') as f:
                a = json.loads(f.read())#转换成字典
                f.close()
            a["package"]["reference_number"]="TEST20210907"+str(random.randint(1,10000000))
            x.append(a)
        date["package_list"]=x
        return date

    def create_big_box_id(pakege_list,token):
        start =time.clock()
        header={
            "Content-Type":"application/json"
            ,"Authorization":"Bearer "+token
        }
        url = ops_Url+"/pos-web/shipment/create/multiple"
        data = json.dumps(BOX.date(pakege_list))
        print(data)
        r1=requests.post(url,data=data,headers=header)

        end = time.clock()
        print('Running time: %s Seconds'%(end-start))
        request=json.loads(json.dumps(r1.text))
        print("order:"+request)
        return json.loads(r1.text)["data"]["bag_id"]