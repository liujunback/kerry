import datetime

import requests
import json

url = "https://pudo-portal-test.parcelbox.net/api/v1/pickup-order"

for i in range(12):
    reference_number = "ITTEST"+str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))
    payload = json.dumps({
      "service": {
        "pudo_code": "ES694649",
        "auth_required": True,
        "auth_code": "23466"
      },
      "consignee": {
        "name": "Bob Consignee",
        "email": "back.j.liu@kln.com",
        "phone": "0987654321"
      },
      "package": {
        "weight": 1500,
        "vol_weight": 1500,
        "length": 16,
        "width": 15,
        "height": 17,
        "number_of_package": 1,
        "tracking_number": "",
        "reference_number": reference_number
      },
      "request_id": "24234"
    })
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJjbWRkN2Y3ZzIwMDBvYTIwcnYzbzRxZWt5IiwiY2xpZW50X2NvZGUiOiJBTVoiLCJpYXQiOjE3NjQ2MDM2ODUsImV4cCI6MTc2NDY5MDA4NX0.6iks0dmge9Czqe7v0ilPITnDCkswywyMFWUynDrPUAc"
    headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    if response.status_code == 201:
        # print(response.text)
        print(reference_number)
    else:
        print(response.text)
