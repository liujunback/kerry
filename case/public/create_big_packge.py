
import json
import random

import requests

from case.public.login import login
import time



# for a in range(1):
def date(pakege_list):
    date={"bag_id":"1231213211","bag_weight":58,"bag_length":52,"bag_width":55,"bag_height":45}
    date["bag_id"]="TEST"+str(random.randint(1000,999999))
    x=[]
    for i in range(pakege_list):
        with open("duyi.txt", 'r',encoding= 'utf-8') as f:
            a = json.loads(f.read())#转换成字典
            f.close()
        a["package"]["reference_number"]=random.randint(1,10000000)
        x.append(a)
        x[i]["package"]["reference_number"]="TEST"+str(random.randint(1,10000000))+str(i)
    date["package_list"]=x
    return date

def create_big_box_id(pakege_list):
    start =time.clock()
    token=login()
    header={"Content-Type":"application/json","Authorization":"Bearer "+token}
    r1=requests.post("http://stg.timesoms.com/api/shipment/create/multiple",data=json.dumps(date(pakege_list)),headers=header)
    end = time.clock()
    #print('Running time: %s Seconds'%(end-start))
    request=json.loads(json.dumps(r1.text))
    # for i in range(0,pakege_list):
    #     print(json.loads(r1.text)["data"]["package_list"][i]["label_url"])
    print("order:"+request)
    return json.loads(r1.text)["data"]["bag_id"]
    # Thread1=threading.Thread(target=login, args=(200,))
    # Thread2=threading.Thread(target=login, args=(200,))
    # Thread3=threading.Thread(target=login, args=(200,))
    # Thread1.start()
    # Thread2.start()
    # Thread3.start()
