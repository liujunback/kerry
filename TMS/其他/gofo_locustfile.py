"""
Single-file Locust script for Gofo create-order + get-label load testing.

Run example:

    pip install locust
    locust -f loadtest/gofo_locustfile.py --headless -u 10 -r 2 -t 5m

Stats names:
    - gofo_token
    - gofo_create_order
    - gofo_get_label
"""

import base64
import copy
import hashlib
import hmac
import json
import os
import time
import uuid
from threading import Lock
from typing import Dict, Optional, Tuple

import urllib3
from locust import HttpUser, between, task


TOKEN_URI = "/openapi/oauth2/token"
CREATE_ORDER_URI = "/open-api/v2/order/create"
LABEL_URI = "/open-api/v2/order/getOrderLabelUrlV2"

DEFAULT_GOFO_HOST = "https://uat-api-eu.gofoexpress.com"
DEFAULT_GOFO_APP_ID = "4a63aadd98aa"
DEFAULT_GOFO_APP_SECRET = "10e5d6b339564aca989c46dd3cdf6c16"
DEFAULT_PRODUCT_CODE = "EU002"


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


VERIFY_SSL = env_bool("GOFO_VERIFY_SSL", True)
if not VERIFY_SSL:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


BASE_PAYLOAD = {
    "cOrderNo": "TRTEST20260630018",
    "ytReference": "AA3343",
    "productType": "ECO",
    "shippingType": "HDN",
    "productCode": DEFAULT_PRODUCT_CODE,
    "declaredValue": "106.00",
    "isCollectionPlan": 1,
    "orderShipper": {
        "shipperName": "lin xia",
        "shipperPhone": "0423897657",
        "shipperCountry": "CN",
        "shipperState": "Ain",
        "shipperCity": "Fareins",
        "shipperArea": "Postbus",
        "shipperStreet": "Rheinstraße 30",
        "shipperCode": "01480",
        "shipperEmail": "ket@lap22oste.net",
    },
    "orderConsignee": {
        "consigneeName": "Any",
        "consigneePhone": "0621219033",
        "consigneeCountry": "FR",
        "consigneeState": "Alpes-Maritimes",
        "consigneeCity": "Beaulieu-sur-Mer",
        "consigneeArea": "-",
        "consigneeStreet": "14 ALL Claude Debussy",
        "consigneeCode": "06310",
        "consigneeEmail": "k.huet@laposte.net",
    },
    "orderGoods": {
        "weight": 1.809,
        "length": 17.0,
        "width": 9.0,
        "height": 6.0,
    },
    "orderItemList": [
        {
            "itemNameEn": "sebuya",
            "itemNameZh": "sebuya",
            "itemQty": "4",
        }
    ],
    "channelCode": "C0001",
    "entryPortCode": 3,
}


def json_dumps(payload: Dict) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def build_signature_content(date_ms: str, method: str, uri: str, body: Optional[str]) -> str:
    sign_map = {
        "date": date_ms,
        "method": method,
        "uri": uri,
    }
    if body:
        sign_map["body"] = body
    items = sorted(sign_map.items(), key=lambda item: item[0])
    return "&".join(f"{key}={value}" for key, value in items)


def build_signature(secret: str, content: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), content.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("utf-8")


def build_headers(app_secret: str, route_country: str, token: str, method: str, uri: str, body: Optional[str]) -> Dict:
    date_ms = str(round(time.time() * 1000))
    content = build_signature_content(date_ms, method, uri, body)
    return {
        "route-country": route_country,
        "sign": build_signature(app_secret, content),
        "date": date_ms,
        "token": token,
        "Content-Type": "application/json",
    }


def build_token_body(app_id: str, app_secret: str) -> str:
    return json_dumps(
        {
            "grantType": "client_credentials",
            "appId": app_id,
            "appSecret": app_secret,
        }
    )


def build_order_no(prefix: str) -> str:
    millis = int(time.time() * 1000)
    suffix = uuid.uuid4().hex[:6].upper()
    return f"{prefix}{millis}{suffix}"


class TokenCache:
    token = ""
    expires_at = 0.0
    lock = Lock()

    @classmethod
    def clear(cls) -> None:
        with cls.lock:
            cls.token = ""
            cls.expires_at = 0.0

    @classmethod
    def get_token(cls, user: "GofoCreateOrderUser") -> str:
        now = time.time()
        if cls.token and cls.expires_at > now:
            return cls.token

        with cls.lock:
            now = time.time()
            if cls.token and cls.expires_at > now:
                return cls.token

            token_body = build_token_body(user.app_id, user.app_secret)
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            with user.client.post(
                TOKEN_URI,
                data=token_body,
                headers=headers,
                name="gofo_token",
                verify=VERIFY_SSL,
                catch_response=True,
            ) as response:
                if response.status_code != 200:
                    response.failure(f"token http {response.status_code}: {response.text}")
                    raise RuntimeError(f"token http {response.status_code}")

                try:
                    response_json = response.json()
                except json.JSONDecodeError as exc:
                    response.failure(f"token json decode failed: {exc}")
                    raise

                access_token = str(response_json.get("accessToken", "")).strip()
                if not access_token:
                    response.failure(f"token missing accessToken: {response.text}")
                    raise RuntimeError("token missing accessToken")

                cls.token = access_token
                cls.expires_at = time.time() + 55
                response.success()
                return cls.token


class GofoCreateOrderUser(HttpUser):
    wait_time = between(0.5, 2)
    host = os.getenv("GOFO_HOST", DEFAULT_GOFO_HOST).rstrip("/")

    def on_start(self) -> None:
        self.client.verify = VERIFY_SSL
        self.app_id = os.getenv("GOFO_APP_ID", DEFAULT_GOFO_APP_ID).strip()
        self.app_secret = os.getenv("GOFO_APP_SECRET", DEFAULT_GOFO_APP_SECRET).strip()
        self.order_prefix = os.getenv("GOFO_ORDER_PREFIX", "TRTEST")
        self.product_code = os.getenv("GOFO_PRODUCT_CODE", DEFAULT_PRODUCT_CODE).strip()

        if not self.host:
            raise RuntimeError("GOFO_HOST is required, e.g. https://example.com")
        if not self.app_id or not self.app_secret:
            raise RuntimeError("GOFO_APP_ID and GOFO_APP_SECRET are required")

        TokenCache.get_token(self)

    def create_order_request(self) -> Tuple[Optional[str], str]:
        payload = copy.deepcopy(BASE_PAYLOAD)
        payload["cOrderNo"] = build_order_no(self.order_prefix)
        payload["productCode"] = self.product_code
        payload["orderConsignee"]["consigneeCountry"] = os.getenv(
            "GOFO_ROUTE_COUNTRY",
            payload["orderConsignee"]["consigneeCountry"],
        ).upper()

        body = json_dumps(payload)
        token = TokenCache.get_token(self)
        headers = build_headers(
            self.app_secret,
            payload["orderConsignee"]["consigneeCountry"],
            token,
            "POST",
            CREATE_ORDER_URI,
            body,
        )

        with self.client.post(
            CREATE_ORDER_URI,
            data=body,
            headers=headers,
            name="gofo_create_order",
            verify=VERIFY_SSL,
            catch_response=True,
        ) as response:
            print(response.text)
            if response.status_code in (401, 403):
                TokenCache.clear()
                response.failure(f"auth failed {response.status_code}: {response.text}")
                return None, payload["orderConsignee"]["consigneeCountry"]

            if response.status_code != 200:
                response.failure(f"http {response.status_code}: {response.text}")
                return None, payload["orderConsignee"]["consigneeCountry"]

            try:
                response_json = response.json()
            except json.JSONDecodeError as exc:
                response.failure(f"json decode failed: {exc}")
                return None, payload["orderConsignee"]["consigneeCountry"]

            api_status = int(response_json.get("status", 0))
            waybill_no = str(response_json.get("data", {}).get("waybillNo", "")).strip()

            if api_status != 1 or not waybill_no:
                message = response_json.get("messageEn") or response_json.get("message") or response.text
                response.failure(f"api failed: {message}")
                return None, payload["orderConsignee"]["consigneeCountry"]

            response.success()
            return waybill_no, payload["orderConsignee"]["consigneeCountry"]

    def get_label_request(self, order_no: str, route_country: str) -> None:
        token = TokenCache.get_token(self)
        headers = build_headers(
            self.app_secret,
            route_country,
            token,
            "GET",
            LABEL_URI,
            None,
        )

        with self.client.get(
            LABEL_URI,
            params={"orderNo": order_no},
            headers=headers,
            name="gofo_get_label",
            verify=VERIFY_SSL,
            catch_response=True,
        ) as response:
            # print(response.text)
            if response.status_code in (401, 403):
                TokenCache.clear()
                response.failure(f"auth failed {response.status_code}: {response.text}")
                return

            if response.status_code != 200:
                response.failure(f"http {response.status_code}: {response.text}")
                return

            try:
                response_json = response.json()
            except json.JSONDecodeError as exc:
                response.failure(f"json decode failed: {exc}")
                return

            api_status = int(response_json.get("status", 0))
            base64_code = str(response_json.get("data", {}).get("base64code", "")).strip()
            if api_status != 1 or not base64_code:
                message = response_json.get("messageEn") or response_json.get("message") or response.text
                response.failure(f"api failed: {message}")
                return

            response.success()

    @task
    def create_order_and_get_label(self) -> None:
        order_no, route_country = self.create_order_request()
        if not order_no:
            return
        self.get_label_request(order_no, route_country)
