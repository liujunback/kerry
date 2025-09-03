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

# with open("../shopee_V2/order_data.txt", 'r',encoding= 'utf-8') as f:
#     payload = json.loads(f.read())#转换成字典
#     payload = {
#                   "data": payload,
#                   "timestamp": 1676448364
#                 }
# payload = json.dumps(jwt(payload))
# print(payload)

# print(json.dumps(jwt({
#   "data": {
#     "carrier_tn": "TWSPTEST20250903102524",
#     "unique_id": "BACKTEST20250903102524"
#   },
#   "timestamp": 1688061603
# })))
