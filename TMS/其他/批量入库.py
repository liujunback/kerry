import time
import requests
import json
from TMS.public.Inbaound import inbound
from TMS.ICBU.status import status
trak=[
"YTMX5080600686634",
"YTMX5080600686605",
"YTMX5080600686602",
"YTMX5080600686603",
"YTMX5080600686598",
"YTMX5080600686599",
"YTMX5080600686596",
"YTMX5080600686597",
"YTMX5080600686628",
"YTMX5080600686629",
"YTMX5080600686630",
"YTMX5080600686625",
"YTMX5080600686626",
"YTMX5080600686627",
"YTMX5080600686606",
"YTMX5080600686609",
"YTMX5080600686611",
"YTMX5080600686617",
"YTMX5080600686623",
"YTMX5080600686624",
"YTMX5080600686632",
"YTMX5080600686607",
"YTMX5080600686608",
"YTMX5080600686600",
"YTMX5080600686601",
"YTMX5080600686618",
"YTMX5080600686619",
"YTMX5080600686620",
"YTMX5080600686621",
"YTMX5080600686622",
"YTMX5080600686616",
"YTMX5080600686613"
]

# for i in range(len(trak)):
#     inbound(trak[i])
# for i in range(len(trak)):
#     status(trak[i], "FX", "出口报关成功")

for i in range(len(trak)):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/zhengbao-customs-clearance-info"
    num_str = str(i).zfill(2)
    payload = json.dumps({
        "appTime": "20250807102050",
        "copNo": "azyinv202508000"+str(num_str),
        "ieDate": "20250807",
        "invtNo": "53452024E10290430"+str(num_str),
        "logisticsNo": trak[i]
    })
    headers = {
        'token': 'eyJ0-W1l#3RhbXAiOjE3$TQ5Nzk^$j#wNDIsIm5vbmNlIjoi-FlL-GRp$z$iLCJ0b2tlbiI6IjBi$T#3$WE^LTIyOTUtNDQwNy1hY2$yLWRhNWJlODVkYWNm$SJ9',
        'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    print(response.text)
