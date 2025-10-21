import time
import requests
import json
from TMS.public.Inbaound import inbound
from TMS.ICBU.status import status
trak=["TN5102000916032","TN5102000916030","TN5102000915680","TN5102000916126","TN5102100916164"]





# for i in range(len(trak)):
#     inbound(trak[i])
# time.sleep(3)
# for i in range(len(trak)):
#     status(trak[i], "FX", "出口报关成功")
invtLT=[]
for i in range(len(trak)):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/zhengbao-customs-clearance-info"
    num_str = str(i).zfill(2)
    invtNo = "53452024E1029043"+str(num_str)
    invtLT.append(invtNo)
    payload = json.dumps({
        "appTime": "20251021184350",
        "copNo": "azyinv20251021"+str(num_str),
        "ieDate": "20251021",
        "invtNo": invtNo,
        "logisticsNo": trak[i]
    })
    headers = {
        'token': 'eyJ0-W1l#3RhbXAiOjE3$TQ5Nzk^$j#wNDIsIm5vbmNlIjoi-FlL-GRp$z$iLCJ0b2tlbiI6IjBi$T#3$WE^LTIyOTUtNDQwNy1hY2$yLWRhNWJlODVkYWNm$SJ9',
        'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    print(invtNo)
print(invtNo)