import json
import random

import requests
from locust import TaskSet, task, HttpUser


class Test(TaskSet):#分拣码性能测试

    @task(2)
    def create_order_TH(self):
        hubin_id=["332","337","328"]
        hubin_id=hubin_id[random.randint(0,1)]
        payload='json=%7B%0A%20%20%20%20%22addressKey%22%3A%22%E0%B8%9A%E0%B8%B5%20%E0%B8%AA%E0%B9%81%E0%B8%84%E0%B8%A7%E0%B8%A3%E0%B9%8C%20%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B8%A3%E0%B8%B2%E0%B8%A1%209-%E0%B9%80%E0%B8%AB%E0%B8%A1%E0%B9%88%E0%B8%87%E0%B8%88%E0%B9%8B%E0%B8%B2%E0%B8%A2%20600%2F43%20%E0%B8%8B%E0%B8%AD%E0%B8%A2%20%E0%B8%A3%E0%B8%B2%E0%B8%A1%E0%B8%84%E0%B8%B3%E0%B9%81%E0%B8%AB%E0%B8%87%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3%2F%20Bangkok%E0%B8%A7%E0%B8%B1%E0%B8%87%E0%B8%97%E0%B8%AD%E0%B8%87%E0%B8%AB%E0%B8%A5%E0%B8%B2%E0%B8%87%2F%20Wang%20Thonglang%22%2C%0A%20%20%20%20%22chargeWeight%22%3A0.3%2C%0A%20%20%20%20%22city%22%3A%22%E0%B8%A7%E0%B8%B1%E0%B8%87%E0%B8%97%E0%B8%AD%E0%B8%87%E0%B8%AB%E0%B8%A5%E0%B8%B2%E0%B8%87%2F%20Wang%20Thonglang%22%2C%0A%20%20%20%20%22codValue%22%3A453%2C%0A%20%20%20%20%22companyId%22%3A1%2C%0A%20%20%20%20%22countryCode%22%3A%22TH%22%2C%0A%20%20%20%20%22custId%22%3A729%2C%0A%20%20%20%20%22declaredValue%22%3A848%2C%0A%20%20%20%20%22goodsType%22%3A%2201%22%2C%0A%20%20%20%20%22hubInCode%22%3A%22LATH01%22%2C%0A%20%20%20%20%22invoiceDubboDTOS%22%3A%5B%0A%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%22brand%22%3A%22default-brand%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22companyId%22%3A1%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22companyNo%22%3A%2251002%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22descrName%22%3A%22Apple%20iPhone%20PROM%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22eDescrNamee%22%3A%22Apple%20iPhonePROM%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22hsCode%22%3A%22default-hsCode%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22origin%22%3A%22%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22pcs%22%3A1%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22price%22%3A848%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22qty%22%3A1%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%5D%2C%0A%20%20%20%20%22hubInId%22%3A'+hubin_id\
                +'%2C%0A%20%20%20%20%22iszdph%22%3A2%2C%0A%20%20%20%20%22orderno%22%3A%22TEiTdddd14y995%22%2C%0A%20%20%20%20%22province%22%3A%22%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3%2F%20Bangkok%22%2C%0A%20%20%20%20%22reZip%22%3A%2210310%22%2C%0A%20%20%20%20%22weig%22%3A0.3%2C%0A%20%20%20%20%22zipCode%22%3A%2210310%22%0A%7D'
        headers = {
          'token': 'eyJ0-W1l#3RhbXAiOjE2$jA^$jA^$D#z$T#sIm5vbmNlIjoi-GpEdFZIdHQiLCJ0b2tlbiI6Ijk0ZjNi$jY4LWI3OTQtNDg3OS1hNDEyLTFhZmNlZT$4ZmZm$yJ9',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
        with self.client.post('/tms-saas-web/bas/sortcode/matchHubOutByOrder', data = payload, headers = headers, name = "泰国sort_code", catch_response = True) as response:
            if hubin_id == "332" and "THLA_NA00_01" in response.text:
                response.success()
            elif hubin_id == "337" and "LATH-01" in response.text:
                response.success()
            elif hubin_id == "328" and "THCA_KE00_01" in response.text:
                response.success()
            else:
                response.failure(response.text)
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(json.dumps(response.text)+"\n").encode('utf-8'))
                failder_data.close()

    @task(2)
    def create_order_MY(self):
        hubin_id=["317","321","328"]
        hubin_id=hubin_id[random.randint(0,1)]
        payload='json=%7B%0A%20%20%20%20%22addressKey%22%3A%22216%20KAMPUNG%20TAMBIRATMalaysiaSarawak%22%2C%0A%20%20%20%20%22chargeWeight%22%3A0.026%2C%0A%20%20%20%20%22city%22%3A%22Sarawak%22%2C%0A%20%20%20%20%22codValue%22%3A145%2C%0A%20%20%20%20%22companyId%22%3A1%2C%0A%20%20%20%20%22countryCode%22%3A%22MY%22%2C%0A%20%20%20%20%22custId%22%3A729%2C%0A%20%20%20%20%22declaredValue%22%3A145%2C%0A%20%20%20%20%22goodsType%22%3A%2201%22%2C%0A%20%20%20%20%22hubInCode%22%3A%22CACNMYG00%22%2C%0A%20%20%20%20%22hubInId%22%3A'+\
                hubin_id+'%2C%0A%20%20%20%20%22invoiceDubboDTOS%22%3A%5B%0A%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%22brand%22%3A%22default-brand%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22companyId%22%3A1%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22companyNo%22%3A%2201%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22descrName%22%3A%22CN%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22eDescrNamee%22%3A%22PHOTOCHROMIC%20SUNGLASSES%20WITH%20POLARIZED%20LENS%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22hsCode%22%3A%2290041000%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22origin%22%3A%22CN%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22pcs%22%3A1%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22price%22%3A666%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22qty%22%3A1%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22sku%22%3A%224746418%22%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%5D%2C%0A%20%20%20%20%22iszdph%22%3A2%2C%0A%20%20%20%20%22orderno%22%3A%22MY050501492131346962963%22%2C%0A%20%20%20%20%22province%22%3A%22Malaysia%22%2C%0A%20%20%20%20%22reZip%22%3A%2294600%22%2C%0A%20%20%20%20%22weig%22%3A0.026%2C%0A%20%20%20%20%22zipCode%22%3A%2294600%22%0A%7D&='
        headers = {
          'token': 'eyJ0-W1l#3RhbXAiOjE2$jA^$jA^$D#z$T#sIm5vbmNlIjoi-GpEdFZIdHQiLCJ0b2tlbiI6Ijk0ZjNi$jY4LWI3OTQtNDg3OS1hNDEyLTFhZmNlZT$4ZmZm$yJ9',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
        with self.client.post('/tms-saas-web/bas/sortcode/matchHubOutByOrder', data = payload, headers = headers, name = "马来sort_code", catch_response = True) as response:
            if hubin_id == "317" and "MYCA_AX0C_01" in response.text:
                response.success()
            elif hubin_id == "321" and "MYOT_AX03_00" in response.text:
                response.success()
            elif hubin_id == "334" and "MYCA_NJ00_01" in response.text:
                response.success()
            else:
                response.failure(response.text)
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(json.dumps(response.text)+"\n").encode('utf-8'))
                failder_data.close()

    @task(2)
    def create_order_HK(self):
        hubin_id=["326","327"]
        hubin_id=hubin_id[random.randint(0,1)]
        payload='json=%7B%0A%20%20%20%20%22addressKey%22%3A%22%E6%B2%99%E7%94%B0%E5%A4%A7%E5%AD%A6%E9%81%93%E9%A6%99%E6%B8%AF%E4%B8%AD%E6%96%87%E5%A4%A7%E5%AD%A6null%E6%96%B0%E7%95%8C%22%2C%0A%20%20%20%20%22chargeWeight%22%3A0.001%2C%0A%20%20%20%20%22city%22%3A%22%E6%96%B0%E7%95%8C%22%2C%0A%20%20%20%20%22codValue%22%3A0%2C%0A%20%20%20%20%22companyId%22%3A1%2C%0A%20%20%20%20%22countryCode%22%3A%22HK%22%2C%0A%20%20%20%20%22custId%22%3A729%2C%0A%20%20%20%20%22declaredValue%22%3A99%2C%0A%20%20%20%20%22goodsType%22%3A%2201%22%2C%0A%20%20%20%20%22hubInCode%22%3A%22CTCNHK000%22%2C%0A%20%20%20%20%22hubInId%22%3A'+\
                hubin_id+'%2C%0A%20%20%20%20%22invoiceDubboDTOS%22%3A%5B%0A%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%22brand%22%3A%22default-brand%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22companyId%22%3A1%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22companyNo%22%3A%2201%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22descrName%22%3A%22PUCHONG%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22eDescrNamee%22%3A%22PUCHONG%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22hsCode%22%3A%22default-hsCode%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22origin%22%3A%22%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22pcs%22%3A3%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22price%22%3A33%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22qty%22%3A3%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%5D%2C%0A%20%20%20%20%22iszdph%22%3A2%2C%0A%20%20%20%20%22orderno%22%3A%22ON0161942954711958299%22%2C%0A%20%20%20%20%22reZip%22%3A%22999077%22%2C%0A%20%20%20%20%22weig%22%3A0.001%2C%0A%20%20%20%20%22zipCode%22%3A%22999077%22%0A%7D&='
        headers = {
          'token': 'eyJ0-W1l#3RhbXAiOjE2$jA^$jA^$D#z$T#sIm5vbmNlIjoi-GpEdFZIdHQiLCJ0b2tlbiI6Ijk0ZjNi$jY4LWI3OTQtNDg3OS1hNDEyLTFhZmNlZT$4ZmZm$yJ9',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
        with self.client.post('/tms-saas-web/bas/sortcode/matchHubOutByOrder', data = payload, headers = headers, name = "香港sort_code", catch_response = True) as response:
            if hubin_id == "326" and "HKCT_KE00_01" in response.text:
                response.success()
            elif hubin_id == "327" and "HKCT_KE01_01" in response.text:
                response.success()
            else:
                response.failure(response.text)
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(json.dumps(response.text)+"\n").encode('utf-8'))
                failder_data.close()

    @task(2)
    def create_order_SG(self):
        hubin_id=["322","324"]
        hubin_id=hubin_id[random.randint(0,1)]
        payload='json=%7B%0A%20%20%20%20%22addressKey%22%3A%2256%20COVE%20DRIVE%2C%20SingaporenullSingapore%22%2C%0A%20%20%20%20%22chargeWeight%22%3A0.001%2C%0A%20%20%20%20%22city%22%3A%22Singapore%22%2C%0A%20%20%20%20%22codValue%22%3A0%2C%0A%20%20%20%20%22companyId%22%3A1%2C%0A%20%20%20%20%22countryCode%22%3A%22SG%22%2C%0A%20%20%20%20%22custId%22%3A729%2C%0A%20%20%20%20%22declaredValue%22%3A50%2C%0A%20%20%20%20%22goodsType%22%3A%2201%22%2C%0A%20%20%20%20%22hubInCode%22%3A%22CACNSGG00%22%2C%0A%20%20%20%20%22hubInId%22%3A'+\
        hubin_id+'%2C%0A%20%20%20%20%22invoiceDubboDTOS%22%3A%5B%0A%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%22brand%22%3A%22default-brand%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22companyId%22%3A1%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22companyNo%22%3A%2201%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22descrName%22%3A%22%E7%9F%AD%E8%A2%96%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22eDescrNamee%22%3A%22T-shirt%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22hsCode%22%3A%22default-hsCode%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22origin%22%3A%22%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22pcs%22%3A5%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22price%22%3A10%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%22qty%22%3A5%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%5D%2C%0A%20%20%20%20%22iszdph%22%3A2%2C%0A%20%20%20%20%22orderno%22%3A%22ON0161847414308364%22%2C%0A%20%20%20%20%22reZip%22%3A%22098175%22%2C%0A%20%20%20%20%22weig%22%3A0.001%2C%0A%20%20%20%20%22zipCode%22%3A%22098175%22%0A%7D&='
        headers = {
          'token': 'eyJ0-W1l#3RhbXAiOjE2$jA^$jA^$D#z$T#sIm5vbmNlIjoi-GpEdFZIdHQiLCJ0b2tlbiI6Ijk0ZjNi$jY4LWI3OTQtNDg3OS1hNDEyLTFhZmNlZT$4ZmZm$yJ9',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
        with self.client.post('/tms-saas-web/bas/sortcode/matchHubOutByOrder', data = payload, headers = headers, name = "新加坡sort_code", catch_response = True) as response:
            if hubin_id == "322" and "SGCA_KE00_01" in response.text:
                response.success()
            elif hubin_id == "324" and "SGCA_KE01_01" in response.text:
                response.success()
            else:
                response.failure(response.text)
                failder_data = open('../request_data/failed_data.txt', 'ab')
                failder_data.write(str(json.dumps(response.text)+"\n").encode('utf-8'))
                failder_data.close()




class websitUser(HttpUser):
    tasks = [Test]
    host = "http://120.24.31.239:20000"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒