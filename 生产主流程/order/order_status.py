from urllib.parse import urljoin

import requests



def order_status(properties,pos_token,tracking_number):
    base_url = properties['url']
    endpoint = f"/pos-web/shipment/status?tracking_number={tracking_number}"
    full_url = urljoin(base_url, endpoint)

    payload = ""
    headers = {
      'Authorization': f'Bearer {pos_token}'
    }

    response = requests.request("GET", full_url, headers=headers, data=payload)
    if "Delivered" or "签收" in response.text:
        print("OK货态校验成功")
    else:
        print("货态校验失败")
