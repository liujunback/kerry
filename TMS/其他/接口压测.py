import ast
import json
import os
import random

import datetime
import openpyxl
import requests

from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    def on_start(self):
        self.token = "e0J7AjwuDEsNb2sJxTgEZq4cQPXvlyMyL7v8nk4m3vfmgrJk1KKuDl91zfKr"
        print(self.token)

    @task(1)
    def create_order(self):#下单

        # 定义请求头
        headers = {
          'x-shopify-shop-domain': 'whitneytestt.myshopify.com',
          'x-shopify-topic': 'orders/updated',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjE1OCwidXNlck5hbWUiOiJiYWNrLmxpdSIsImlhdCI6MTY4ODM2OTY3MiwiZXhwIjoxNjg4OTc0NDcyfQ.PXmAksSeC2bjfE8XZ7-Gq4NWB-geiKlBfRBDDszEatg',
          'Content-Type': 'application/json'
        }
        param2 = json.dumps({
                          "id": 5618447253805,
                          "admin_graphql_api_id": "gid://shopify/Order/5618447253805",
                          "app_id": 1354745,
                          "browser_ip": None,
                          "buyer_accepts_marketing": False,
                          "cancel_reason": None,
                          "cancelled_at": None,
                          "cart_token": None,
                          "checkout_id": 37374528913709,
                          "checkout_token": "7cf7e37d7914d9fc808718e42529d229",
                          "client_details": {
                            "accept_language": None,
                            "browser_height": None,
                            "browser_ip": None,
                            "browser_width": None,
                            "session_hash": None,
                            "user_agent": None
                          },
                          "closed_at": None,
                          "company": None,
                          "confirmation_number": "LGV0AWGWV",
                          "confirmed": True,
                          "contact_email": "fdsbafba@gmail.com",
                          "created_at": "2023-12-08T04:25:30-05:00",
                          "currency": "HKD",
                          "current_subtotal_price": "7.81",
                          "current_subtotal_price_set": {
                            "shop_money": {
                              "amount": "7.81",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "1.00",
                              "currency_code": "USD"
                            }
                          },
                          "current_total_additional_fees_set": None,
                          "current_total_discounts": "0.00",
                          "current_total_discounts_set": {
                            "shop_money": {
                              "amount": "0.00",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "0.00",
                              "currency_code": "USD"
                            }
                          },
                          "current_total_duties_set": None,
                          "current_total_price": "7.81",
                          "current_total_price_set": {
                            "shop_money": {
                              "amount": "7.81",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "1.00",
                              "currency_code": "USD"
                            }
                          },
                          "current_total_tax": "0.00",
                          "current_total_tax_set": {
                            "shop_money": {
                              "amount": "0.00",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "0.00",
                              "currency_code": "USD"
                            }
                          },
                          "customer_locale": "en-US",
                          "device_id": None,
                          "discount_codes": [],
                          "email": "fdsbafba@gmail.com",
                          "estimated_taxes": False,
                          "financial_status": "paid",
                          "fulfillment_status": None,
                          "landing_site": None,
                          "landing_site_ref": None,
                          "location_id": None,
                          "merchant_of_record_app_id": None,
                          "name": "#WY1181WY",
                          "note": None,
                          "note_attributes": [],
                          "number": 181,
                          "order_number": 1181,
                          "order_status_url": "https://whitneytestt.myshopify.com/74978591021/orders/6c6e96bcf666ec8da1ad1ddbc1f45004/authenticate?key=2df7678d7913596e4a455961355fcb04",
                          "original_total_additional_fees_set": None,
                          "original_total_duties_set": None,
                          "payment_gateway_names": [
                            "manual"
                          ],
                          "phone": None,
                          "po_number": None,
                          "presentment_currency": "USD",
                          "processed_at": "2023-12-08T04:25:30-05:00",
                          "reference": None,
                          "referring_site": None,
                          "source_identifier": None,
                          "source_name": "shopify_draft_order",
                          "source_url": None,
                          "subtotal_price": "7.81",
                          "subtotal_price_set": {
                            "shop_money": {
                              "amount": "7.81",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "1.00",
                              "currency_code": "USD"
                            }
                          },
                          "tags": "",
                          "tax_exempt": False,
                          "tax_lines": [],
                          "taxes_included": False,
                          "test": False,
                          "token": "6c6e96bcf666ec8da1ad1ddbc1f45004",
                          "total_discounts": "0.00",
                          "total_discounts_set": {
                            "shop_money": {
                              "amount": "0.00",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "0.00",
                              "currency_code": "USD"
                            }
                          },
                          "total_line_items_price": "7.81",
                          "total_line_items_price_set": {
                            "shop_money": {
                              "amount": "7.81",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "1.00",
                              "currency_code": "USD"
                            }
                          },
                          "total_outstanding": "0.00",
                          "total_price": "7.81",
                          "total_price_set": {
                            "shop_money": {
                              "amount": "7.81",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "1.00",
                              "currency_code": "USD"
                            }
                          },
                          "total_shipping_price_set": {
                            "shop_money": {
                              "amount": "0.00",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "0.00",
                              "currency_code": "USD"
                            }
                          },
                          "total_tax": "0.00",
                          "total_tax_set": {
                            "shop_money": {
                              "amount": "0.00",
                              "currency_code": "HKD"
                            },
                            "presentment_money": {
                              "amount": "0.00",
                              "currency_code": "USD"
                            }
                          },
                          "total_tip_received": "0.00",
                          "total_weight": 12000,
                          "updated_at": "2023-12-08T04:25:32-05:00",
                          "user_id": 95553945901,
                          "billing_address": {
                            "first_name": None,
                            "address1": "62 Southgate Blvd #62e",
                            "phone": "1 (929) 609-5444",
                            "city": "New Castle",
                            "zip": "19720",
                            "province": "Delaware",
                            "country": "United States",
                            "last_name": "cadde",
                            "address2": None,
                            "company": None,
                            "latitude": 39.6925703,
                            "longitude": -75.5721092,
                            "name": "cadde",
                            "country_code": "US",
                            "province_code": "DE"
                          },
                          "customer": {
                            "id": 7371023319341,
                            "email": "fdsbafba@gmail.com",
                            "accepts_marketing": False,
                            "created_at": "2023-10-05T23:24:08-04:00",
                            "updated_at": "2023-12-08T04:25:31-05:00",
                            "first_name": None,
                            "last_name": "cadde",
                            "state": "disabled",
                            "note": None,
                            "verified_email": True,
                            "multipass_identifier": None,
                            "tax_exempt": False,
                            "phone": None,
                            "email_marketing_consent": {
                              "state": "not_subscribed",
                              "opt_in_level": "single_opt_in",
                              "consent_updated_at": None
                            },
                            "sms_marketing_consent": None,
                            "tags": "",
                            "currency": "USD",
                            "accepts_marketing_updated_at": "2023-10-05T23:24:08-04:00",
                            "marketing_opt_in_level": None,
                            "tax_exemptions": [],
                            "admin_graphql_api_id": "gid://shopify/Customer/7371023319341",
                            "default_address": {
                              "id": 9530811449645,
                              "customer_id": 7371023319341,
                              "first_name": None,
                              "last_name": "cadde",
                              "company": None,
                              "address1": "62 Southgate Blvd #62e",
                              "address2": None,
                              "city": "New Castle",
                              "province": "Delaware",
                              "country": "United States",
                              "zip": "19720",
                              "phone": "1 (929) 609-5444",
                              "name": "cadde",
                              "province_code": "DE",
                              "country_code": "US",
                              "country_name": "United States",
                              "default": True
                            }
                          },
                          "discount_applications": [],
                          "fulfillments": [],
                          "line_items": [
                            {
                              "id": 14350874837293,
                              "admin_graphql_api_id": "gid://shopify/LineItem/14350874837293",
                              "fulfillable_quantity": 1,
                              "fulfillment_service": "manual",
                              "fulfillment_status": None,
                              "gift_card": False,
                              "grams": 12000,
                              "name": "backtest1208",
                              "price": "7.81",
                              "price_set": {
                                "shop_money": {
                                  "amount": "7.81",
                                  "currency_code": "HKD"
                                },
                                "presentment_money": {
                                  "amount": "1.00",
                                  "currency_code": "USD"
                                }
                              },
                              "product_exists": True,
                              "product_id": 9047317250349,
                              "properties": [],
                              "quantity": 1,
                              "requires_shipping": True,
                              "sku": "backtest1208",
                              "taxable": True,
                              "title": "backtest1208",
                              "total_discount": "0.00",
                              "total_discount_set": {
                                "shop_money": {
                                  "amount": "0.00",
                                  "currency_code": "HKD"
                                },
                                "presentment_money": {
                                  "amount": "0.00",
                                  "currency_code": "USD"
                                }
                              },
                              "variant_id": 47704369266989,
                              "variant_inventory_management": "shopify",
                              "variant_title": "",
                              "vendor": "Whitneytestt",
                              "tax_lines": [],
                              "duties": [],
                              "discount_allocations": []
                            }
                          ],
                          "payment_terms": None,
                          "refunds": [],
                          "shipping_address": {
                            "first_name": None,
                            "address1": "62 Southgate Blvd #62e",
                            "phone": "1 (929) 609-5444",
                            "city": "New Castle",
                            "zip": "19720",
                            "province": "Delaware",
                            "country": "United States",
                            "last_name": "cadde",
                            "address2": None,
                            "company": None,
                            "latitude": 39.6925703,
                            "longitude": -75.5721092,
                            "name": "cadde",
                            "country_code": "US",
                            "province_code": "DE"
                          },
                          "shipping_lines": []
                        })
        with self.client.post('/platform/shopify/webhooks', data = param2, headers = headers, name = "测试", catch_response = True) as response:
            if "success" in response.text:
                response.success()
                # print(json.loads(response.text)["data"]["label"])
                print(response.text)

            else:
                response.failure("fail")
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://stg-foms-api.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒