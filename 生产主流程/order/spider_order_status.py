import datetime

import requests
import json


def send_tracking(tracking_number):

    url = "https://spider.kec-app.com/package/tracking/spider"

    payload = json.dumps({
        "tracking_number": tracking_number,
        "event": [
            {
                "event_date": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "timezone": "+01:00",
                "event_code": "E010670V",
                "event_remark": "签收",
                "location": "",
                "ns": "12°44'N",
                "ew": "12°44'E"
            }
        ]
    })
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer Y2FkZTE3ZjFjYTI5MTJiMzZmOGE4NDE5YjNiY2E3M2E='
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    if response.status_code == 201:
        print("spider货态推送："+tracking_number)
