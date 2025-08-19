import time
import requests
import json
from TMS.public.Inbaound import inbound
from TMS.ICBU.status import status
trak=["YTMX5081500744941"
]
for i in range(len(trak)):
    inbound(trak[i])
time.sleep(3)
for i in range(len(trak)):
    status(trak[i], "FX", "出口报关成功")

# for i in range(len(trak)):
#     url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/zhengbao-customs-clearance-info"
#     num_str = str(i).zfill(2)
#     invtNo = "53452024E1029043"+str(num_str)
#     payload = json.dumps({
#         "appTime": "20250807102050",
#         "copNo": "azyinv20250800"+str(num_str),
#         "ieDate": "20250807",
#         "invtNo": invtNo,
#         "logisticsNo": trak[i]
#     })
#     headers = {
#         'token': 'eyJ0-W1l#3RhbXAiOjE3$TQ5Nzk^$j#wNDIsIm5vbmNlIjoi-FlL-GRp$z$iLCJ0b2tlbiI6IjBi$T#3$WE^LTIyOTUtNDQwNy1hY2$yLWRhNWJlODVkYWNm$SJ9',
#         'Content-Type': 'application/json'
#     }
#     response = requests.request("POST", url, headers=headers, data=payload)
#
#     print(invtNo)
