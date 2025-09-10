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


# with open("../shopee_V2/box_data.txt", 'r', encoding='utf-8') as f:
#     payload = json.loads(f.read())  # 转换成字典
#     payload = {
#         "data": payload,
#         "data": payload,
#         "data": payload,
#         "timestamp": 1676447280
#     }
#     f.close()
# box_num = "TWYSPKM25090400802"
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
#
# headers = {
#     'Content-Type': 'application/json'
# }
# print(payload)

# print(json.dumps(jwt({
#   "data": {
#     "carrier_tn": "TWSPTEST20250910102457",
#     "unique_id": "BACKTEST20250910102457"
#   },
#   "timestamp": 1688061603
# })))
# parcel_list=["TEST202509051142480"]
# parcel_list_data = []
# for i in range(len(parcel_list)):
with open("../shopee_V2/order_data.txt", 'r', encoding='utf-8') as f:
    payload = json.loads(f.read())  # 转换成字典
    payload = {
        "data": payload,
        "timestamp": 1676448364
    }
    f.close()
#     payload["data"]["order"]["carrier_tn"] = box_num
#     payload["data"]["order"]["ilh_shopee_no"] = ilh_shopee_no
#     data_list = payload["data"]["parcel_list"][0]
#     data_list["domestic_third_party_no"] = parcel_list[i]
#     data_list["reference_no"] = parcel_list[i]
#     data_list["shopee_order_no"] = parcel_list[i]
#     parcel_list_data.append(data_list)
# payload["data"]["parcel_list"] = parcel_list_data
# print(payload)
payload = json.dumps(jwt(payload))
print(payload)