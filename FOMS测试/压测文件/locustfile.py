"""FOMS 建单压测：每单 50 个不同 SKU，1 -> 5 -> 10 -> 20 -> 30 -> 40 用户。

使用方式（PowerShell，Python 3.9+，Locust 2.x，单机运行）：
  python -m pip install locust
  $env:FOMS_TOKEN = '有效的 FOMS 建单 Bearer Token，不带 Bearer 前缀'
  $env:FOMS_SKU_FILE = 'C:/path/to/skus.txt'
  python -m locust -f locustfile.py --host https://目标域名 --headless --stop-timeout 65 --csv results --html report.html

skus.txt 每行一个真实 SKU，必须正好 50 个且不重复；也可使用 JSON 数组：
  ["SKU001", "SKU002", ...]
或为每个 SKU 单独提供商品信息，覆盖 Postman 的首条商品模板：
  [{"sku_code":"SKU001","qty":1,"unit_price":10,"weight":0.2}, ...]
也可直接填写下面的 SKU_CODES，或用 FOMS_SKU_CODES 环境变量（英文逗号分隔）。
50 个 SKU 应已存在于所选公司及目标仓，文件不会创建 SKU。

默认读取用户提供的原始 Postman 文件，不执行其中的脚本，不读取其中的 Token。
默认请求为 openApi_创建order；FOMS_REQUEST_NAME 可改成 创建Sales_Order Copy。
--host 显式选择目标；没有默认生产地址。鉴权由 FOMS_TOKEN 提供。
FOMS_POSTMAN_COLLECTION 可覆盖文件位置。
FOMS_COMPANY_CODE / FOMS_WAREHOUSE_CODE / FOMS_LOGISTICS_CODE 可覆盖对应字段。
未设置覆盖项时，保留 Postman 的公司归属、仓库、物流、地址及履约方式。

1 用户预热 60 秒，5/10/20/30/40 用户各保持 120 秒；达到人数后开始计时。
FOMS_WARMUP_SECONDS / FOMS_STAGE_SECONDS / FOMS_SPAWN_RATE 可调整时长和爬升速度。
FOMS_WAIT_SECONDS 默认 0，每个用户最多同时发出一个请求；40 用户不是 40 RPS。
FOMS_TIMEOUT_SECONDS 默认 60，失败请求不重试，重定向不跟随。

只将 HTTP 201/202 且 JSON code 与 HTTP 一致计为接口成功。
202 仅代表受理，201/202 均不证明订单最终履约完成。
统计按目标并发阶段分组（包含爬升过程），结束时另打印 201/202 数量。
Locust CSV/HTML 含延迟与错误率。本文件按单机设计，不使用 --master/--worker。
订单号、运单号及结果写入 FOMS_OUTPUT_DIR（默认本文件旁 results）便于追踪。
模板中的测试面单内容会复用，运单字段每次生成新值，不用于真实派送。

官方用法：
https://docs.locust.io/en/stable/configuration.html#custom-load-shapes
https://docs.locust.io/en/stable/writing-a-locustfile.html#validating-responses
"""
from __future__ import annotations

import copy
import csv
import json
import logging
import math
import os
import re
import time
import uuid
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlsplit

from locust import HttpUser, LoadTestShape, events, task
from locust.runners import MasterRunner


ENDPOINT = '/api/foms/v2/order/create'
DEFAULT_COLLECTION = Path('C:/Users/bliuj/Desktop/kerry/日常文件/postman文件/生产FOMS.postman_collection.json')
SKU_CODES = []  # 可在这里填写 50 个真实 SKU 字符串，或使用上面的文件/环境变量。
LEVELS = (1, 5, 10, 20, 30, 40)
LOG = logging.getLogger('foms.loadtest')
STATE = None


def number_setting(name, default, allow_zero=False):
    value = float(os.environ.get(name, default))
    if not math.isfinite(value) or value < 0 or (value == 0 and not allow_zero):
        raise ValueError(f'{name} 必须是有效的正数' + ('或 0' if allow_zero else ''))
    return value


def walk_requests(items, parent=''):
    for item in items:
        path = f"{parent}/{item.get('name', '')}".strip('/')
        if 'item' in item:
            yield from walk_requests(item['item'], path)
        if 'request' in item:
            yield path, item


def read_template():
    collection_path = Path(os.environ.get('FOMS_POSTMAN_COLLECTION', str(DEFAULT_COLLECTION)))
    collection = json.loads(collection_path.read_text(encoding='utf-8-sig'))
    selected_name = os.environ.get('FOMS_REQUEST_NAME', 'openApi_创建order')
    matches = []
    for path, item in walk_requests(collection.get('item', [])):
        request = item['request']
        url = request.get('url', '')
        raw_url = url if isinstance(url, str) else url.get('raw', '')
        if request.get('method') == 'POST' and urlsplit(raw_url).path == ENDPOINT:
            if selected_name in (path, item.get('name')):
                matches.append(request)
    if len(matches) != 1:
        raise ValueError(f'必须唯一选中建单请求，请检查 FOMS_REQUEST_NAME：{selected_name}')
    body_spec = matches[0].get('body', {})
    if body_spec.get('mode') != 'raw':
        raise ValueError('建单模板必须是 raw JSON')
    body = json.loads(body_spec.get('raw', ''))
    if not isinstance(body, dict) or not isinstance(body.get('items'), list) or not body['items']:
        raise ValueError('Postman 建单模板必须包含非空 items 数组')
    for field, variable in [('company_code', 'FOMS_COMPANY_CODE'),
                            ('warehouse_code', 'FOMS_WAREHOUSE_CODE')]:
        if variable in os.environ:
            body[field] = os.environ[variable]
    logistics = body.get('logistics_provider')
    if not isinstance(logistics, dict):
        raise ValueError('Postman 模板缺少 logistics_provider 对象')
    if 'FOMS_LOGISTICS_CODE' in os.environ:
        logistics['code'] = os.environ['FOMS_LOGISTICS_CODE']
    return body


def read_items(template):
    if os.environ.get('FOMS_SKU_FILE'):
        content = Path(os.environ['FOMS_SKU_FILE']).read_text(encoding='utf-8-sig')
        entries = json.loads(content) if content.lstrip().startswith('[') else [
            line.strip() for line in content.splitlines() if line.strip()
        ]
    elif os.environ.get('FOMS_SKU_CODES'):
        entries = [value.strip() for value in os.environ['FOMS_SKU_CODES'].split(',')]
    else:
        entries = SKU_CODES
    if not isinstance(entries, list) or len(entries) != 50:
        raise ValueError('请通过 FOMS_SKU_FILE、FOMS_SKU_CODES 或 SKU_CODES 配置正好 50 个真实 SKU')
    codes, items = set(), []
    for index, entry in enumerate(entries, 1):
        item = copy.deepcopy(template['items'][0])
        if isinstance(entry, str):
            item['sku_code'] = entry.strip()
        elif isinstance(entry, dict):
            if not entry.get('sku_code'):
                raise ValueError(f'第 {index} 个商品缺少 sku_code')
            item.update(copy.deepcopy(entry))
        else:
            raise ValueError(f'第 {index} 个 SKU 必须是字符串或商品对象')
        code = item.get('sku_code')
        if not isinstance(code, str) or not code.strip() or code != code.strip() or code in codes:
            raise ValueError(f'第 {index} 个 SKU 为空、重复或带首尾空格')
        codes.add(code)
        quantity = item.get('qty')
        if isinstance(quantity, bool) or not isinstance(quantity, int) or quantity < 1:
            raise ValueError(f'第 {index} 个商品 qty 必须是正整数')
        try:
            price = Decimal(str(item['unit_price']))
            if not price.is_finite() or price < 0:
                raise ValueError()
        except (KeyError, InvalidOperation, ValueError):
            raise ValueError(f'第 {index} 个商品 unit_price 必须是非负数') from None
        # 同一模板复制出的平台明细 ID 不能重复。
        if 'platform_item_id' in item:
            item['platform_item_id'] = str(10000 + index)
        items.append(item)
    return items


def build_payload(template, items):
    payload = copy.deepcopy(template)
    unique = uuid.uuid4().hex
    order = 'LT' + datetime.now(timezone.utc).strftime('%y%m%d') + '-' + unique[:20]
    payload['order_number'] = order
    payload['items'] = copy.deepcopy(items)
    platform = payload.get('platform')
    if isinstance(platform, dict) and 'order_number' in platform:
        platform['order_number'] = order
    if 'platform_order_number' in payload:
        payload['platform_order_number'] = order
    logistics = payload['logistics_provider']
    if 'tracking_number' in logistics:
        logistics['tracking_number'] = 'LTN' + unique[:24]
    if 'declared_value' in payload:
        total = sum(Decimal(str(item['unit_price'])) * item['qty'] for item in items)
        payload['declared_value'] = float(total)
    return payload


def response_verdict(status, body):
    if status not in (201, 202):
        return False, f'HTTP {status}', body.get('code') if isinstance(body, dict) else None
    if not isinstance(body, dict):
        return False, '响应不是 JSON 对象', None
    if body.get('code') != status:
        return False, f'业务 code 与 HTTP {status} 不一致', body.get('code')
    return True, '', body['code']


@events.test_start.add_listener
def prepare_test(environment, **kwargs):
    global STATE
    if isinstance(environment.runner, MasterRunner):
        return
    try:
        host = environment.host or FomsOrderUser.host
        parsed = urlsplit(host or '')
        if parsed.scheme not in ('http', 'https') or not parsed.netloc or parsed.path not in ('', '/'):
            raise ValueError('请用 --host 或 FOMS_HOST 设置目标根地址，不要包含接口路径')
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('目标根地址不能包含凭据、查询参数或 fragment')
        token = os.environ.get('FOMS_TOKEN', '').strip()
        if token.startswith('Bearer '):
            token = token[7:].strip()
        if not token or '{{' in token:
            raise ValueError('请通过 FOMS_TOKEN 设置有效的建单接口 Token')
        template = read_template()
        items = read_items(template)
        sample = build_payload(template, items)
        if re.search(r'\{\{[^{}]+\}\}', json.dumps(sample, ensure_ascii=False)):
            raise ValueError('请求模板包含未解析的 Postman 变量，请先替换或用环境变量覆盖')
        timeout = number_setting('FOMS_TIMEOUT_SECONDS', 60)
        wait = number_setting('FOMS_WAIT_SECONDS', 0, allow_zero=True)
        output = Path(os.environ.get('FOMS_OUTPUT_DIR', str(Path(__file__).parent / 'results')))
        output.mkdir(parents=True, exist_ok=True)
        report_path = output / f'orders-{datetime.now(timezone.utc):%Y%m%dT%H%M%S}-{uuid.uuid4().hex[:8]}.csv'
        stream = report_path.open('x', encoding='utf-8-sig', newline='')
        writer = csv.writer(stream)
        writer.writerow(['started_at_utc', 'target_users', 'order_number', 'tracking_number',
                         'http_status', 'business_code', 'elapsed_ms', 'api_success'])
        STATE = dict(template=template, items=items, token=token, timeout=timeout, wait=wait,
                     stream=stream, writer=writer, counts=Counter(), report_path=report_path)
        LOG.info('配置已加载：host=%s request=%s 每单SKU=50 仓库=%s 结果=%s',
                 host, os.environ.get('FOMS_REQUEST_NAME', 'openApi_创建order'),
                 template.get('warehouse_code'), report_path)
    except (ValueError, OSError, KeyError) as exc:
        LOG.error('压测配置无效：%s', exc)
        raise SystemExit(2) from None


@events.test_stop.add_listener
def close_test(environment, **kwargs):
    if STATE:
        STATE['stream'].close()
        LOG.info('接口结果统计（202仅表示受理）：%s；订单记录：%s',
                 dict(STATE['counts']), STATE['report_path'])


class FomsOrderUser(HttpUser):
    host = os.environ.get('FOMS_HOST') or None

    def wait_time(self):
        return STATE['wait']

    def on_start(self):
        self.client.headers.update({'Authorization': 'Bearer ' + STATE['token'],
                                    'Content-Type': 'application/json'})

    @task
    def create_order(self):
        payload = build_payload(STATE['template'], STATE['items'])
        shape = self.environment.shape_class
        level = getattr(shape, 'target_users', self.environment.runner.user_count)
        started_at = datetime.now(timezone.utc).isoformat()
        started = time.perf_counter()
        with self.client.post(ENDPOINT, json=payload, name=f'{ENDPOINT} [users={level:02d}]',
                              timeout=STATE['timeout'], allow_redirects=False,
                              catch_response=True) as response:
            try:
                body = response.json()
            except ValueError:
                body = None
            success, reason, code = response_verdict(response.status_code, body)
            if success:
                response.success()
            else:
                response.failure(reason)
            STATE['counts'][f'HTTP {response.status_code} / code {code} / {"PASS" if success else "FAIL"}'] += 1
            STATE['writer'].writerow([started_at, level, payload['order_number'],
                                      payload['logistics_provider'].get('tracking_number', ''),
                                      response.status_code, code,
                                      round((time.perf_counter() - started) * 1000, 2), success])


class StepToForty(LoadTestShape):
    """每一级达到目标用户数后保持指定时长，末级完成自动结束。"""

    def __init__(self):
        super().__init__()
        self.warmup = number_setting('FOMS_WARMUP_SECONDS', 60)
        self.hold = number_setting('FOMS_STAGE_SECONDS', 120)
        self.spawn = number_setting('FOMS_SPAWN_RATE', 5)
        self.index = 0
        self.reached_at = None
        self.target_users = LEVELS[0]

    def reset_time(self):
        super().reset_time()
        self.index = 0
        self.reached_at = None
        self.target_users = LEVELS[0]

    def tick(self):
        if self.index >= len(LEVELS):
            return None
        now = self.get_run_time()
        self.target_users = LEVELS[self.index]
        if self.get_current_user_count() < self.target_users:
            self.reached_at = None
            return self.target_users, self.spawn
        if self.reached_at is None:
            self.reached_at = now
            LOG.info('达到 %d 并发用户，开始保持阶段', self.target_users)
        duration = self.warmup if self.index == 0 else self.hold
        if now - self.reached_at >= duration:
            self.index += 1
            self.reached_at = None
            if self.index >= len(LEVELS):
                return None
            self.target_users = LEVELS[self.index]
        return self.target_users, self.spawn
