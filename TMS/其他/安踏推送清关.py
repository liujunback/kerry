import time
import requests
import json
from TMS.public.Inbaound import inbound
from TMS.ICBU.status import status
trak=["TN5102200916214",
"TN5102100916185",
"TN5102100916184",
"TN5102100916170",
"TN5102100916165",
"TN5102100916163",
"TN5102100916161",
"TN5102100916159",
"TN5102000916113",
"TN5102000916070",
"TN5102000916056",
"TN5102000916022",
"TN5102000915709",
"TN_580621142107719026",
"PH234478390772D",
"LXBPH000263888889",
"LXBPH000263888888",
"LXBMY000107073760",
"YD5110400917872",
"YD5110400917871",
"YD5110400917870",
"YD5110400917867",
"YD5110400917865",
"YD5110400917864",
"YD110400917831",
"YD110400917829",
"YD110400917828",
"YD110400917827",
"YD110400917826",
"YD110400917824",
"YD110400917823",
"YD110400917822"]





# for i in range(len(trak)):
#     inbound(trak[i])
# time.sleep(3)
# for i in range(len(trak)):
#     status(trak[i], "FX", "出口报关成功")
invtLT=[]
for i in range(len(trak)):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/zhengbao-customs-clearance-info"
    num_str = str(i).zfill(2)
    invtNo = "53452024E1111044"+str(num_str)
    invtLT.append(invtNo)
    payload = json.dumps({
        "appTime": "20251111184350",
        "copNo": "azyinv20251111"+str(num_str),
        "ieDate": "20251021",
        "invtNo": invtNo,
        "logisticsNo": trak[i]
    })
    headers = {
        'token': 'eyJ0-W1l#3RhbXAiOjE3$TQ5Nzk^$j#wNDIsIm5vbmNlIjoi-FlL-GRp$z$iLCJ0b2tlbiI6IjBi$T#3$WE^LTIyOTUtNDQwNy1hY2$yLWRhNWJlODVkYWNm$SJ9',
        'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    print(trak[i] +"              " +  invtNo)
# print(invtNo)