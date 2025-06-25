import ast
import json
import random

import openpyxl
import redis
import requests
x=[]

def open_excel():#读取ececl数据
    wb = openpyxl.load_workbook('../file_data/FF.xlsx')#TH泰国参数
    ws = wb.active
    data = []
    for i in range(2,21000):
         x=str(ws['A'+str(i)].value)
         data.append(json.loads(x))
    return data

def creat_order(token):#下单接口调用，匹配新旧关系码

    header = {
        'Content-Type':'application/json',
        "Authorization":"Bearer"+" "+token
        }
    dataList = open_excel()
    for i in range(2871,len(dataList)):
        data = dataList[i]
        if data['receiver']['country_code'] == "MY":
            CACNMY001 = ["KUL-P-SZF","KCH-P-SZF","BKI-P-SZF","CACNMYG00"]
            CACNMY002=['KUL-M-SZF','BKI-M-SZF','KCH-M-SZF','KUL-M-SZH']
            # DTMYMY000=['KUL-Q-KUL(ZJ)','BKI-Q-BKI(ZJ)','KCH-Q-KCH(ZJ)','OTMYMY000']
            # AACNMY101=['MYCOD-PF','CACNMYG01']
            # AACNMY102=['MYCOD-MF','CACNMYS01']
            # CACNMY001=['KUL-P-SZF(SC)','KCH-P-SZF(SC)','BKI-P-SZF(SC)','LACNMYG00']
            # CACNMY002=['KUL-M-SZF(SC)','KCH-M-SZF(SC)','BKI-M-SZF(SC)','LACNMYS00']
            if data['service']['channel_code'] in CACNMY001:
                data['service']['channel_code'] = "CACNMY001"
            if data['service']['channel_code'] in CACNMY002:
                data['service']['channel_code'] = "CACNMY002"
            # if data['service']['channel_code'] in DTMYMY000:
            #     data['service']['channel_code'] = "DTMYMY000"
            # if data['service']['channel_code'] in AACNMY101:
            #     data['service']['channel_code'] = "AACNMY101"
            # if data['service']['channel_code'] in AACNMY102:
            #     data['service']['channel_code'] = "AACNMY102"
            # if data['service']['channel_code'] in CACNMY001:
            #     data['service']['channel_code'] = "CACNMY001"
            # if data['service']['channel_code'] in CACNMY002:
            #     data['service']['channel_code'] = "CACNMY002"
            else:
                data['service']['channel_code'] = "CACNMY001"
            reference_number="TH20210521"+str(random.randint(1,99999999999999))
            data['package']['reference_number']=reference_number
            response = requests.post("http://120.78.66.231:8000/pos-web/shipment/create" ,data=json.dumps(data), headers = header)
            if "success" in response.text:
                print(json.loads(response.text))
                pool = redis.ConnectionPool(host='localhost', port=6379, db = 3)
                r = redis.Redis(connection_pool=pool)
                label_url = json.loads(response.text)["data"]["label_url"]
                r.set(reference_number,label_url)
            else:
                print(response.text)
                print(i)
                data = json.dumps(data)
                with open('../request_data/failed_data.txt', 'ab') as failder_data:
                    failder_data.write(str(data+"\n").encode('utf-8'))
                    failder_data.close()

        if data['receiver']['country_code'] == "SG":

            CACNSG001=['SG-P-SZF','CACNSGG00']
            CACNSG002=['SG-M-SZF','CACNSGS00']
            # AACNSG101=['SG-P-SZF(COD)','CACNSGG01']
            # AACNSG102=['SG-M-SZF(COD)','CACNSGS01']
            # OTCNSG200=['SG(2)','CTCNSG000']
            # OTCNSG300=['SG(COD2)','CTCNSG001']
            if data['service']['channel_code'] in CACNSG001:
                data['service']['channel_code'] = "CACNSG001"
            if data['service']['channel_code'] in CACNSG002:
                data['service']['channel_code'] = "CACNSG002"
            # if data['service']['channel_code'] in AACNSG101:
            #     data['service']['channel_code'] = "AACNSG101"
            # if data['service']['channel_code'] in AACNSG102:
            #     data['service']['channel_code'] = "AACNSG102"
            # if data['service']['channel_code'] in OTCNSG200:
            #     data['service']['channel_code'] = "OTCNSG200"
            # if data['service']['channel_code'] in OTCNSG300:
            #     data['service']['channel_code'] = "OTCNSG300"
            else:
                data['service']['channel_code'] = "CACNSG001"
            reference_number="TH20210521"+str(random.randint(1,99999999999999))
            data['package']['reference_number']=reference_number
            response = requests.post("http://120.78.66.231:8000/pos-web/shipment/create" ,data=json.dumps(data), headers = header)
            if "success" in response.text:
                print(json.loads(response.text))
                pool = redis.ConnectionPool(host='localhost', port=6379, db = 2)
                r = redis.Redis(connection_pool=pool)
                label_url = json.loads(response.text)["data"]["label_url"]
                r.set(reference_number,label_url)
            else:
                print(response.text)
                print(i)
                data = json.dumps(data)
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(data+"\n").encode('utf-8'))
                failder_data.close()
        if data['receiver']['country_code'] == "TH":
            # AACNTH001 = ["TH-P-SZF","CACNTHG00"]
            # AACNTH002=['TH-M-SZF','CACNTHS00']
            # AACNTH101=['TH-P-SZF(COD)','CACNTHG01']
            # AACNTH102=['TH-M-SZF(COD)','CACNTHS01']
            # OTCNTH200=['TH(2)','CTCNTH000']
            # OTCNTH300=['TH(COD2)','CTCNTH001']
            # ATCNTH000=['CTCNTH002','TH-Q-SZL']
            # AACNTH100=['CTCNTH003','TH-Q-SZL(COD)']
            # CACNTH001=['LACNTHG00','TH-P-SZF(SC)']
            # CACNTH002=['LACNTHS00','TH-M-SZF(SC)']
            # CTCNTH000=['LTCNTHG00','TH-P-SZL(SC)-F']
            # CTCNTH402=['LTCNTHC00','LTCNTHC00']
            # DTTHTH000=['TH-Q-TH(ZJ)','TH-Q-TH(ZJ)']
            # DTTHTH100=['TH-Q-TH(CODZJ)']
            # if data['service']['channel_code'] in AACNTH001:
            #     data['service']['channel_code'] = "AACNTH001"
            # if data['service']['channel_code'] in AACNTH002:
            #     data['service']['channel_code'] = "AACNTH002"
            # if data['service']['channel_code'] in AACNTH101:
            #     data['service']['channel_code'] = "AACNTH101"
            # if data['service']['channel_code'] in AACNTH102:
            #     data['service']['channel_code'] = "AACNTH102"
            # if data['service']['channel_code'] in OTCNTH200:
            #     data['service']['channel_code'] = "OTCNTH200"
            # if data['service']['channel_code'] in OTCNTH300:
            #     data['service']['channel_code'] = "OTCNTH300"
            # if data['service']['channel_code'] in ATCNTH000:
            #     data['service']['channel_code'] = "ATCNTH000"
            # if data['service']['channel_code'] in CACNTH001:
            #     data['service']['channel_code'] = "CACNTH001"
            # if data['service']['channel_code'] in AACNTH100:
            #     data['service']['channel_code'] = "AACNTH100"
            # if data['service']['channel_code'] in CACNTH002:
            #     data['service']['channel_code'] = "CACNTH002"
            # if data['service']['channel_code'] in CTCNTH000:
            #     data['service']['channel_code'] = "CTCNTH000"
            # if data['service']['channel_code'] in CTCNTH402:
            #     data['service']['channel_code'] = "CTCNTH402"
            # else:
            data['service']['channel_code'] = "CTCNTH000"
            reference_number="TH20210521"+str(random.randint(1,99999999999999))
            data['package']['reference_number']=reference_number
            response = requests.post("http://120.78.66.231:8000/pos-web/shipment/create" ,data=json.dumps(data), headers = header)
            if "success" in response.text:
                print(json.loads(response.text))
                pool = redis.ConnectionPool(host='localhost', port=6379, db = 2)
                r = redis.Redis(connection_pool=pool)
                label_url = json.loads(response.text)["data"]["label_url"]
                r.set(reference_number,label_url)
            else:
                print(response.text)
                print(i)
                data = json.dumps(data)
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(data+"\n").encode('utf-8'))
                failder_data.close()
        if data['receiver']['country_code'] == "HK":
            # ATCNHK000=['HK-Q-SZL','CTCNHK000']
            # ATCNHK100=['HK-Q-SZL(COD)','CTCNHK001']
            # OTCNHK200=['HK-Q-SZL(2)','CTCNHK002']
            # OTCNHK300=['HK-Q-SZL(COD2)','CTCNHK003']
            # if data['service']['channel_code'] in ATCNHK000:
            #     data['service']['channel_code'] = "ATCNHK000"
            # if data['service']['channel_code'] in ATCNHK100:
            #     data['service']['channel_code'] = "ATCNHK100"
            # if data['service']['channel_code'] in OTCNHK200:
            #     data['service']['channel_code'] = "OTCNHK200"
            # if data['service']['channel_code'] in OTCNHK300:
            #     data['service']['channel_code'] = "OTCNHK300"
            # else:
            data['service']['channel_code'] = "CTCNHK000"
            reference_number="TH20210521"+str(random.randint(1,99999999999999))
            data['package']['reference_number']=reference_number
            response = requests.post("http://120.78.66.231:8000/pos-web/shipment/create" ,data=json.dumps(data), headers = header)
            if "success" in response.text:
                print(json.loads(response.text))
                pool = redis.ConnectionPool(host='localhost', port=6379, db = 2)
                r = redis.Redis(connection_pool=pool)
                label_url = json.loads(response.text)["data"]["label_url"]
                r.set(reference_number,label_url)
            else:
                print(response.text)
                print(i)
                data = json.dumps(data)
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(data+"\n").encode('utf-8'))
                failder_data.close()


def file_create_order(token):
    header = {
        'Content-Type':'application/json',
        "Authorization":"Bearer"+" "+token
        }
    with open("../file_data/order_data.txt", 'r',encoding= 'utf-8') as f:
        param2 = json.loads(f.read())#转换成字典
        f.close()
    reference_number="TESTBACK"+str(random.randint(1,9999999999))
    # reference_number = "LP00502183426066"
    param2['package']['reference_number']=reference_number
    url = "http://47.119.120.7:8000/pos-web/shipment/create"
    # start =time.clock()
    response = requests.post(url ,data=json.dumps(param2), headers = header)
    # end = time.clock()
    # print('Running time: %s Seconds'%(end-start))
    # print(reference_number)
    if response.status_code ==201:
        print(response.text)
        # print(json.loads(response.text)["data"]["label_url"])
        print(json.loads(response.text)["data"]["tracking_number"])
        # success_length = open('../request_data/success_length.txt', 'ab')
        # success_length.write(((json.loads(response.text)["data"]["tracking_number"])+"\n").encode('utf-8'))
        # success_length.close()
    else:
        print(reference_number)
        print(response.text)

    return json.loads(response.text)["data"]["tracking_number"]
