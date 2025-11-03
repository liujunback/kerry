import datetime
import json
import copy
import base64



def jwt(payload):
    header={
        "account": "first_leg_standard",
        "alg": "HS256",
        "typ": "jwt",
        "secret":"test123456"
            }
    header = json.dumps(header,separators=(",",":"),sort_keys=True)
    part1 = str(base64.urlsafe_b64encode(header.encode()).replace(b'=', b'')).replace("'","")[1:]
    payload_dict = copy.deepcopy(payload)
    payload_dict = json.dumps(payload_dict,separators=(",", ":"),sort_keys=True)
    part2 = str(base64.urlsafe_b64encode(payload_dict.encode()).replace(b'=', b'')).replace("'","")[1:]
    jwt_data = part1 + "." + part2 + "." + part1
    return {"JWT":jwt_data}


with open("../shopee_V2/box_data.txt", 'r', encoding='utf-8') as f:
    payload = json.loads(f.read())  # 转换成字典
    payload = {
        "data": {"parcel_list":["TEST202510131720100","TEST202510131720101","TEST202510131720102","TEST202510131720103","TEST202510131720104"],"order":{"unique_id":"BACKTEST20251013172011","carton_length":45,"receiver":{"address":"Jalan Lapangan Terbang, 93250 Kuching, Sarawak，Malaysia","city":"Kuching","zipcode":523000,"phone":-658930936,"name":"Shopee","state":"Sarawak","region":"Malaysia","region_code":"MY"},"pre_carrier_info":{"carrier_name":"TWYS"},"destination_region_name":"Malaysia","destination_region":"MY","carton_no":"TWSPTEST20251013172010","carton_weight":21.085,"next_carrier_info":{"carrier_tn":"TWYSPKM25090400802","carrier_name":"ABX-(IM)MY","carrier_code":110091},"ilh_shopee_no":"BACKTEST20251013172010","carrier_tn":"TWSPTEST20251013172010","sender":{"address":"Si hai road 1666","city":"Jinhua","phone":149772764,"district":"Yiwu","name":"Logistics Sorting Hub","state":"Zhejiang","region":"China","region_code":"CN"},"parcel_qty":89,"carton_height":49.5,"transport_type":1,"carton_volume":120285,"service_code":"MB79","goods_type":0,"carton_width":54}},
        "timestamp": 1676447280
    }
    f.close()
# box_num = "TWSPTEST20251013163819"
# ilh_shopee_no = "BACKTEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))
# unique_id = "BACKTEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))
# payload["data"]["order"]["carrier_tn"] = box_num
# payload["data"]["order"]["carton_no"] = box_num
# payload["data"]["order"]["ilh_shopee_no"] = ilh_shopee_no
# payload["data"]["order"]["unique_id"] = unique_id
# parcel_list = []
# for i in range(5):
#     parcel_list.append("TEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(i))
# payload["data"]["parcel_list"] = parcel_list
# payload = json.dumps(jwt(payload))
# print(payload)
# headers = {
#     'Content-Type': 'application/json'
# }
# print(payload)

print(json.dumps(jwt({
  "data": {
    "carrier_tn": "TWSPTEST20251027142832",
    "unique_id": "BACKTEST20251027142832"
  },
  "timestamp": 1688061603
})))
# parcel_list=["TEST202509051142480"]
# parcel_list_data = []
# for i in range(len(parcel_list)):
# with open("../shopee_V2/order_data.txt", 'r', encoding='utf-8') as f:
#     payload = json.loads(f.read())  # 转换成字典
#     payload = {
#         "data": payload,
#         "timestamp": 1676448364
#     }
#     f.close()
#     payload["data"]["order"]["carrier_tn"] = box_num
#     payload["data"]["order"]["ilh_shopee_no"] = ilh_shopee_no
#     data_list = payload["data"]["parcel_list"][0]
#     data_list["domestic_third_party_no"] = parcel_list[i]
#     data_list["reference_no"] = parcel_list[i]
#     data_list["shopee_order_no"] = parcel_list[i]
#     parcel_list_data.append(data_list)
# payload["data"]["parcel_list"] = parcel_list_data
# print(payload)
