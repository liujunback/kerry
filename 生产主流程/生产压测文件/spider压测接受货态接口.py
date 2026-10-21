# locustfile.py
import random
from datetime import datetime, timedelta
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from locust import HttpUser, task, between

# ================= 基础配置 =================
HOST = "https://spider.kec-app.com"
PATH = "/package/tracking/spider"

COOKIE = (
    "incap_ses_442_3123216=7jYpClwI30PsdOrl1EwiBvX81moAAAAAECUmfFgH47s0XY3L/iw33g==; "
    "incap_ses_442_3236174=98g6MWKo3F49gSzm1EwiBvYO12oAAAAADFkS/LEHGrtjxQmotR6D1A==; "
    "nlbi_3123216=OBpJYW6J2kwdpfC+/UJfNAAAAAASRcnWIXQylI3vKYXcLCSG; "
    "nlbi_3236174=WeFpHngfu3b5kCsbX4m3QgAAAAC2Bkc91Wezgo3iBNNPAQYz; "
    "visid_incap_3123216=/gDYOv+VSaKhT24OTv2jV0pcV2oAAAAAQUIPAAAAAABCo0qJShT3bFylhmglXI7d; "
    "visid_incap_3236174=kOcRvmbKTGytcZct8MxlDBFfYGoAAAAAQUIPAAAAAABMePNpmyF/AdnJ6PpuPNp9"
)

AUTHORIZATION = "Bearer 5pNADbaiS4EWuV6HGwBcJR8dUflvTQYMe1rqxIFXj0s2mgth3LznyoPK9Z7C"

# 业务成功码（接口返回的是字符串 "201"）
SUCCESS_CODES = {"201", 201}

# ================= 随机数据池 =================
EVENT_CODES = [
    "rbctest",
    "rbcpickedup",
    "rbcintransit",
    "rbcarrived",
    "rbcoutfordelivery",
    "rbcattempted",
    "rbcdelivered",
    "rbcreturn",
    "rbcincustoms",
    "rbchold",
]

LOCATIONS = [
    "SANTIAGO",
    "BUENOS AIRES",
    "LIMA",
    "BOGOTA",
    "MEXICO CITY",
    "SAO PAULO",
    "MONTEVIDEO",
]

REMARKS = [
    "Recibido Para Reparto En Sucursal Centro Distribucion Regional : Sin Moradores",
    "En transito hacia sucursal destino",
    "Intento de entrega fallido, destinatario ausente",
    "Paquete entregado en domicilio",
    "En aduana, pendiente de revision",
    "En poder del transportista",
    "Devolucion solicitada por remitente",
]

TIMEZONES = ["-03:00", "-04:00", "-05:00", "-06:00", "+00:00"]


# ================= 随机生成函数 =================
def random_tracking_number() -> str:
    return str("KECTH50839234")


def random_event_date() -> str:
    offset_seconds = random.randint(0, 7 * 24 * 3600)
    dt = datetime.now() - timedelta(seconds=offset_seconds)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def random_event_code() -> str:
    return random.choice(EVENT_CODES)


def build_event() -> dict:
    return {
        "event_date": random_event_date(),
        "timezone": random.choice(TIMEZONES),
        "event_code": random_event_code(),
        "event_remark": random.choice(REMARKS),
        "location": random.choice(LOCATIONS),
    }


def build_payload() -> dict:
    events = [build_event() for _ in range(random.randint(1, 3))]
    events.sort(key=lambda x: x["event_date"])
    return {
        "tracking_number": random_tracking_number(),
        "re_tracking_number": "",
        "event": events,
    }


# ================= Locust 用户 =================
class TrackingSpiderUser(HttpUser):
    host = HOST
    wait_time = between(1, 3)

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Cookie": COOKIE,
        "Authorization": AUTHORIZATION,
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
    }

    @task
    def push_tracking_event(self):
        payload = build_payload()
        first_code = payload["event"][0]["event_code"]

        with self.client.post(
            PATH,
            json=payload,
            headers=self.headers,
            name="POST /package/tracking/spider",
            catch_response=True,
            verify=False,
            allow_redirects=True,
        ) as resp:
            # 1) HTTP 层校验：接受所有 2xx（接口成功返回 201）
            if not (200 <= resp.status_code < 300):
                resp.failure(
                    f"HTTP {resp.status_code} | event_code={first_code} | "
                    f"body={resp.text[:200]}"
                )
                return

            # 2) 业务层校验：{"code":"201","message":"success"}
            try:
                body = resp.json()
            except ValueError:
                resp.failure(
                    f"非 JSON 响应 | event_code={first_code} | {resp.text[:200]}"
                )
                return

            code = body.get("code") if isinstance(body, dict) else None
            print(body)
            if code not in SUCCESS_CODES:
                resp.failure(
                    f"业务失败 | event_code={first_code} | code={code} | body={body}"
                )
                return

            resp.success()