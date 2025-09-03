import time
import requests
import json
from TMS.public.Inbaound import inbound
from TMS.ICBU.status import status
trak=["YTMX5082200794281","YTMX5082200794285","YTMX5082200794284","YTMX5082200794312","YTMX5082200794290","YTMX5082200794302","YTMX5082200794288","YTMX5082200794303","YTMX5082200794278","YTMX5082200794311","YTMX5082200794313","YTMX5082200794276","YTMX5082200794298","YTMX5082200794309","YTMX5082200794286","YTMX5082200794277","YTMX5082200794282","YTMX5082200794280","YTMX5082200794307","YTMX5082200794300","YTMX5082200794297","YTMX5082200794289","YTMX5082200794306","YTMX5082200794283","YTMX5082200794292","YTMX5082200794294","YTMX5082200794304","YTMX5082200794308","YTMX5082200794293","YTMX5082200794296","YTMX5082200794310","YTMX5082200794291","YTMX5082200794279","YTMX5082200794279"]





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
        "appTime": "20250822102050",
        "copNo": "azyinv20250822"+str(num_str),
        "ieDate": "20250822",
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