import datetime
import random
import time

import requests
import json
for i in range(20):
    url = "https://spider.kec-app.com/package/booking"
    reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%H%M%S')) + str(random.randint(1, 300))

    payload = json.dumps({
              "shipper": {
                "house_number": "",
                "address1": "906 9/F Chao Phya Tower, 89 Soi Wat suan Plu, Charoen Krung road, Bangrak, Bangkok, Thailand 10500.",
                "address2": "",
                "province": "Bangkok",
                "city": "Khlong Toei",
                "district": "-",
                "sub_district": "-",
                "country_code": "TH",
                "email": "linpeixin@sf-express.com",
                "location_id": "",
                "name": "POPMART",
                "tax_number": "0000000",
                "company_name": "Popmart",
                "phone": "66959477818",
                "postcode": "10110",
                "ioss_number": "",
                "ioss_number_country": "",
                "tax_number_type": "",
                "id_card_number": "0000000",
                "id_card_number_type": "",
                "pickup_at": "",
                "pickup_cutoff_at": ""
              },
              "consignee": {
                "house_number": "",
                "address1": "36/336 ศุภาลัยเวลลิงตัน 2 ถนนเทียมร่วมมิตร แขวงห้วยขวาง เขตห้วยขวาง  ",
                "address2": "",
                "province": "Bangkok",
                "city": "ห้วยขวาง",
                "district": "Thailand",
                "sub_district": "Thailand",
                "country_code": "TH",
                "email": "jeab0901@gmail.com",
                "location_id": "",
                "name": "ประภาศรี เพชรสุข",
                "tax_number": "0000000",
                "company_name": "ประภาศรี เพชรสุข",
                "phone": "0863547461",
                "postcode": "10310",
                "tax_number_type": "",
                "id_card_number": "0000000",
                "id_card_number_type": ""
              },
              "package": {
                "actual_weight": "1.660",
                "estimate_weight": "1.660",
                "weight_unit": "kg",
                "cod_value": "0.00",
                "cod_value_currency": "CNY",
                "declared_value": "294.00",
                "declared_value_currency": "CNY",
                "dimension_height": "1.000",
                "dimension_length": "1.000",
                "dimension_width": "1.000",
                "dimension_unit": "cm",
                "item_quantity": "1",
                "order_number": reference_number,
                "shipper_reference_id": reference_number,
                "payment_method": "PP",
                "number_of_package": "1",
                "shipment_term": "DDP",
                "insurance_value": "0.00",
                "insurance_currency": "",
                "insurance_type": "",
                "shipping_fee": "0.00",
                "cargo_value": "",
                "package_type": "WPX"
              },
              "reference": {
                "track_require": False,
                "delivery_method": "to_door",
                "user_uuid": "times-oms",
                "provider_info": {
                  "fixed_shipper_name": "",
                  "label_show_shipper": "",
                  "action_code": "U",
                  "label_type": "",
                  "is_enable_insurance_service": "",
                  "fixed_shipper_district": "",
                  "fixed_shipper_postcode": "",
                  "company_slug": "kerryth",
                  "company_account": "PPMT",
                  "is_local_shipment": "no",
                  "tracking_number": "true",
                  "service_code": "AUTO",
                  "cod_type": "CASH",
                  "company_token": "2a84476c-033f-4b2e-986f-4010690cf483",
                  "is_show_item": "Y",
                  "is_skip_declaredValue_verify": " ",
                  "show_cod": "true",
                  "show_fob": "true",
                  "fixed_shipper_phone": "",
                  "fixed_shipper_country_code": "",
                  "cs_info": "-\\u0E43\\u0E19\\u0E01\\u0E23\\u0E13\\u0E35\\u0E17\\u0E35\\u0E48\\u0E2A\\u0E34\\u0E19\\u0E04\\u0E49\\u0E32\\u0E44\\u0E21\\u0E48\\u0E15\\u0E23\\u0E07\\u0E15\\u0E32\\u0E21\\u0E17\\u0E35\\u0E48\\u0E2A\\u0E31\\u0E48\\u0E07\\u0E2B\\u0E23\\u0E37\\u0E2D\\u0E40\\u0E2A\\u0E35\\u0E22\\u0E2B\\u0E32\\u0E22 \\u0E2A\\u0E32\\u0E21\\u0E32\\u0E23\\u0E16\\u0E41\\u0E08\\u0E49\\u0E07\\u0E40\\u0E1B\\u0E25\\u0E35\\u0E48\\u0E22\\u0E19\\u0E2A\\u0E34\\u0E19\\u0E04\\u0E49\\u0E32\\u0E2B\\u0E23\\u0E37\\u0E2D\\u0E04\\u0E37\\u0E19\\u0E2A\\u0E34\\u0E19\\u0E04\\u0E49\\u0E32\\u0E20\\u0E32\\u0E22\\u0E43\\u0E197\\u0E27\\u0E31\\u0E19\\u0E19\\u0E31\\u0E1A\\u0E08\\u0E32\\u0E01\\u0E27\\u0E31\\u0E19\\u0E17\\u0E35\\u0E48\\u0E23\\u0E31\\u0E1A\\u0E2A\\u0E34\\u0E19\\u0E04\\u0E49\\u0E32\\u0E27\\u0E31\\u0E19\\u0E41\\u0E23\\u0E01 (\\u0E01\\u0E23\\u0E13\\u0E35\\u0E17\\u0E35\\u0E48\\u0E2A\\u0E34\\u0E19\\u0E04\\u0E49\\u0E32\\u0E44\\u0E21\\u0E48\\u0E16\\u0E39\\u0E01\\u0E43\\u0E0A\\u0E49\\u0E07\\u0E32\\u0E19\\u0E41\\u0E25\\u0E30\\u0E2D\\u0E22\\u0E39\\u0E48\\u0E43\\u0E19\\u0E2A\\u0E20\\u0E32\\u0E1E\\u0E40\\u0E14\\u0E34\\u0E21\\u0E40\\u0E17\\u0E48\\u0E32\\u0E19\\u0E31\\u0E49\\u0E19) -n-\\u0E2A\\u0E34\\u0E19\\u0E04\\u0E49\\u0E32\\u0E1B\\u0E23\\u0E30\\u0E40\\u0E20\\u0E17\\u0E0A\\u0E38\\u0E14\\u0E0A\\u0E31\\u0E49\\u0E19\\u0E43\\u0E19 \\u0E44\\u0E21\\u0E48\\u0E2A\\u0E32\\u0E21\\u0E32\\u0E23\\u0E16\\u0E40\\u0E1B\\u0E25\\u0E35\\u0E48\\u0E22\\u0E19\\u0E2B\\u0E23\\u0E37\\u0E2D\\u0E04\\u0E37\\u0E19\\u0E2A\\u0E34\\u0E19\\u0E04\\u0E49\\u0E32\\u0E44\\u0E14\\u0E49 -n-\\u0E1A\\u0E23\\u0E34\\u0E01\\u0E32\\u0E23\\u0E25\\u0E39\\u0E01\\u0E04\\u0E49\\u0E32\\u0E2A\\u0E31\\u0E21\\u0E1E\\u0E31\\u0E19\\u0E18\\u0E4C 020263868",
                  "fixed_shipper_address1": "",
                  "fixed_shipper_city": "",
                  "fixed_shipper_address2": "",
                  "fixed_shipper_province": ""
                },
                "extra_response_info": "-",
                "sort_code": "THDT_KE00_00",
                "client_code": "861280",
                "client_name": "泡泡马特",
                "ori_pickup_no": "",
                "sale_platform": "KEC",
                "service": {
                  "service_type": "default"
                }
              },
              "items": [
                {
                  "category_id": "",
                  "category_name": "",
                  "brand": "",
                  "model": "",
                  "description": "DIMOO ELEPHANT IN MOONLIGHT - Vinyl Plush Blister Pack",
                  "name": "DIMOO ELEPHANT IN MOONLIGHT - Vinyl Plush Blister Pack",
                  "description_origin_language": "DIMOO ELEPHANT IN MOONLIGHT - 搪胶毛绒吊卡",
                  "platform_id": "-",
                  "platform_name": "-",
                  "quantity": "1",
                  "sku": "1250331012",
                  "unit_price": "210.00",
                  "currency": "CNY",
                  "weight_unit": "kg",
                  "single_weight": "0.830",
                  "dimension_height": "20.000",
                  "dimension_length": "13.000",
                  "dimension_width": "11.000",
                  "sale_platform_url": "",
                  "dimension_unit": "cm",
                  "manufacture_country_code": "CN",
                  "manufacture_country_name": "CHINA, PEOPLES REPUBLIC",
                  "original_tracking_number": "",
                  "description_destination_language": "",
                  "battery_type": "",
                  "number_of_batteries": "",
                  "platform_product_id": "",
                  "hts_code": ""
                },
                {
                  "category_id": "",
                  "category_name": "",
                  "brand": "",
                  "model": "",
                  "description": "DIMOO Weaving Wonders Series Figures",
                  "name": "DIMOO Weaving Wonders Series Figures",
                  "description_origin_language": "DIMOO梦里梦外系列手办",
                  "platform_id": "-",
                  "platform_name": "-",
                  "quantity": "1",
                  "sku": "1240605034",
                  "unit_price": "84.00",
                  "currency": "CNY",
                  "weight_unit": "kg",
                  "single_weight": "0.830",
                  "dimension_height": "10.000",
                  "dimension_length": "7.000",
                  "dimension_width": "7.000",
                  "sale_platform_url": "",
                  "dimension_unit": "cm",
                  "manufacture_country_code": "CN",
                  "manufacture_country_name": "CHINA, PEOPLES REPUBLIC",
                  "original_tracking_number": "",
                  "description_destination_language": "",
                  "battery_type": "",
                  "number_of_batteries": "",
                  "platform_product_id": "",
                  "hts_code": ""
                }
              ]
            })
    headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer e0J7AjwuDEsNb2sJxTgEZq4cQPXvlyMyL7v8nk4m3vfmgrJk1KKuDl91zfKr'
    }


    time_start = time.time()
    response = requests.request("POST", url, headers=headers, data=payload)
    time_end = time.time()
    print('下单耗时：', round(time_end - time_start, 2), 's')
    print(response.text)
