import requests
import json


def update_sku(properties,foms_token,sku_number):

    url = properties['url'] + "/api/foms/v2/sku/update"

    payload = json.dumps({
      "sku_code": sku_number,
      "barcodes": [
        sku_number + "-1"
      ],
      "name": "Hxdfasdfasdfs",
      "model": "V2.19",
      "description": "FLAT RA, 33RD FLOOR TOWER 1 LE PRESTIGE 1 LOHAS PARK RD",
      "description_origin_language": "FLAT RA, 33RD FLOOR TOWER 1 LE PRESTIGE 1 LOHAS PARK RD",
      "origin_country": "CN",
      "hts_code": {
        "default": "123456",
        "ES": "1234563210",
        "CN": "0321654987"
      },
      "declare_name": "H",
      "queue_order": "FIFO",
      "declared_value": 123,
      "currency": "CNY",
      "is_serial_number_required": "N",
      "is_virtual_sku": "N",
      "is_batch_required": "N",
      "is_packing_material": "N",
      "is_expire_date_required": "N",
      "is_manufacture_date_required": "N",
      "is_udf1_required": "N",
      "is_udf2_required": "N",
      "is_udf3_required": "N",
      "temperature_condition": "AIR_CONDITIONED",
      "qty_ per_carton": 5,
      "carton_per_pallet": 6,
      "is_fragile": "N",
      "height": 110,
      "length": 110,
      "width": 50,
      "weight": 12,
      "capture_serial_number_in": "INBOUND",
      "validate_serial_number_in": "INBOUND",
      "validate_serial_number_by": "FORMAT",
      "serial_number_formats": [
        {
          "serial_number_format": "XXXXXXXXXX"
        }
      ]
    })
    headers = {
      'Authorization': 'Bearer ' + foms_token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)['code']== 202:
        print("SKU更新成功。")
        print("")
    else:
        print(response.text)
