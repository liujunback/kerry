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

    print(response.text)
