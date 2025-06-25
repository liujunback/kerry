import json
import random
import urllib

import redis
import requests
def find():
    payload={
        "postalType":"TH",
        "countryCode":"TH",
        "district":"",
        "city":"",
        "addressKey":"",
        "zip":"96220",
        "weig":"1",
        "token":"94a3b3b3-5b93-4c1d-b9f4-4fe9bded620b"
    }
    headers = {

      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }

    r2=requests.post("http://120.24.31.239:20000/tms-saas-web/bms/lineremotefee/find" ,data=payload ,headers=headers)
    print(r2.text)
    #print(json.loads(r2.text)["body"]["fee"])


def login():


    r2 = requests.post("http://120.24.31.239:20000/tms-saas-web/user/login?userNo=zmuser&password=123456&companyNo=&domain=")
    print(json.loads(r2.text)["body"]["token"])



def redisTest():
    pool = redis.ConnectionPool(host='localhost', port=6379 ,db =0)
    r = redis.Redis(connection_pool=pool)
    print(r.llen("db0"))
def spider():
    import requests



    payload="{\r\n    \"shipper\":{\r\n        \"address1\":\"nanjing west road, No.1515, building 3\",\r\n        \"address2\":\"\",\r\n        \"province\":\"shanghai\",\r\n        \"city\":\"shanghai\",\r\n        \"district\":\"shanghai\",\r\n        \"sub_district\":\"jianan\",\r\n        \"country_code\":\"CN\",\r\n        \"email\":\"\",\r\n        \"location_id\":\"\",\r\n        \"name\":\"gao mo\",\r\n        \"id_card_number\":\"0000000\",\r\n        \"company_name\":\"wishpost\",\r\n        \"phone\":\"966666666\",\r\n        \"postcode\":\"30506\"\r\n    },\r\n    \"consignee\":{\r\n        \"address1\":\"54 ann st apt#1\",\r\n        \"address2\":\"\",\r\n        \"province\":\"Alicante\",\r\n        \"city\":\"Alicante\",\r\n        \"district\":\"-\",\r\n        \"sub_district\":\"-\",\r\n        \"country_code\":\"ES\",\r\n        \"email\":\"\",\r\n        \"location_id\":\"\",\r\n        \"name\":\"Carlota Lopez\",\r\n        \"id_card_number\":\"0000000\",\r\n        \"company_name\":\"-\",\r\n        \"phone\":\"966666666\",\r\n        \"postcode\":\"30506\"\r\n    },\r\n    \"package\":{\r\n        \"actual_weight\":\"0.01\",\r\n        \"estimate_weight\":\"0.15\",\r\n        \"weight_unit\":\"kg\",\r\n        \"cod_value\":0,\r\n        \"cod_value_currency\":\"USD\",\r\n        \"declared_value\":\"1.2\",\r\n        \"declared_value_currency\":\"USD\",\r\n        \"dimension_height\":\"\",\r\n        \"dimension_length\":\"\",\r\n        \"dimension_width\":\"\",\r\n        \"dimension_unit\":\"cm\",\r\n        \"item_quantity\":1,\r\n        \"order_number\":\"\",\r\n        \"shipper_reference_id\":\"WishTest202103234001\",\r\n        \"payment_method\":\"PP\",\r\n        \"shipment_term\":\"DDU\",\r\n        \"number_of_package\":\"1\",\r\n        \"insurance_value\":0,\r\n        \"insurance_currency\":\"\"\r\n    },\r\n    \"reference\":{\r\n        \"track_require\":true,\r\n        \"delivery_method\":\"to_door\",\r\n        \"user_uuid\":\"5f59c786-1808-4fb9-8dc8-8cda78a8d815\",\r\n        \"config_uuid\":\"SpiderDynamicKRegisterBroker\",\r\n        \"provider_info\":{\r\n            \"locker_id\":\"\",\r\n            \"company_slug\":\"envialia\"\r\n        },\r\n        \"extra_response_info\":\"-\",\r\n        \"sort_code\":\"KR_ES01_01\",\r\n        \"client_code\":null,\r\n        \"client_name\":\"\"\r\n    },\r\n    \"items\":[\r\n        {\r\n            \"category_id\":\"\",\r\n            \"category_name\":\"\",\r\n            \"brand\":\"\",\r\n            \"model\":\"\",\r\n            \"description\":\"Mass market paperback\",\r\n            \"name\":\"桌游产品豪华版\",\r\n            \"platform_id\":\"WishPost\",\r\n            \"platform_name\":\"WishPost\",\r\n            \"quantity\":1,\r\n            \"sku\":\"普通硅胶表带--1105_38mm/40mm--SM_Cactus_deleted_853713d9-ce40-4770-add7-c5bcae370adb_dele\",\r\n            \"unit_price\":1.2,\r\n            \"currency\":\"USD\",\r\n            \"single_weight\":null,\r\n            \"weight_unit\":\"kg\",\r\n            \"description_origin_language\":\"\",\r\n            \"dimension_height\":\"\",\r\n            \"dimension_length\":\"\",\r\n            \"dimension_width\":\"\",\r\n            \"dimension_unit\":\"cm\",\r\n            \"hts_code\":\"\",\r\n            \"manufacture_country_code\":\"\",\r\n            \"manufacture_country_name\":\"\"\r\n        }\r\n    ]\r\n}"
    headers = {
      'Content-Type': 'application/json',
      'authorization': 'Bearer test123token'
    }

    response = requests.post("http://stg.spider.tec-api.com/package/booking", headers=headers, data=payload.encode('utf-8'))
    print(payload)

    print(response.text.encode('utf-8'))



def sushu(number):
	if number < 2:
		return 0
	elif number == 2:
		return 2
	else:
		for i in range(2, number - 1):
			if number % i == 0:
				return 1
	return 2

# for value in range(0, 100):
#     if sushu(value) == 2:
#         print(value)
def break_Loop():
    l= [0,2,3,5,6,7]
    L1 = list()
    for i in range(0,len(l)):
        if i== 4:
            break
        L1.append(l[i])
    print(L1)
def continue_Loop():
    l= [0,2,3,5,6,7]
    li = list()
    for i in range(0,len(l)):
        if i== 4:
            continue
        li.append(l[i])
    print(li)
class RabbitSequence:
    def __init__(self, index):
        self.sequence = list()
        for i in range(0,index):
            if i== 0 or i== 1:
                self.sequence.append(i)
            else:
                self.sequence.append(self.sequence[i-1]+ self.sequence[i-2])
class A:
    def __init__(self,value):
        self.a = value
    def get_a(self):
        if self.a is None:
            raise Exception("ais not value")
        return self.a
    def set_a(self, value):
        self.a = value
class B(A):
    def __init__(self,value):
        self.b = value
    def set_b(self,value):
        self.b = value
    def get_b(self):
        if self.b is None:
            raise Exception("c is not value")
        return self.b

class C(A):
    def __init__(self, value):
        super(C,self).__init__(value)
        self.c = value
    def set_c(self, value):
        self.c = value
    def get_c(self):
        if self.c is None:
            raise Exception("c is not value")
        return self.c
if __name__=="__main__":
    a0 = A(3)
    print(a0.a)
    co = C(9)
    print(co.c)
    print(co.a)
    b0 = B(20)
    print(b0.b)
    # print(b0.a)

