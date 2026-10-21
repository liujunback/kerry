import argparse
import csv
import io
import json
import os
import time
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

import requests
from openpyxl import load_workbook


QUERY_URL = "http://8.129.96.252:89/api/order/query"
PUSH_URL = "https://tms-eng.kec.kln.cn/tms-saas-web/zhengbao-customs-clearance-info"

DEFAULT_QUERY_HEADERS = {
    "app-code": "S0300",
    "app-key": "654688FC33A59C50516C0229252257AF",
    "app-timestamp": "1784514768",
    "app-sign": "yigEHy86M/+JK1+YLzo6hhTkzmQZzw0TIz02FGnSnbsPUyf0oTEjtwqDTbZIATmRQNmTDvfdwnEr7zzionDEHw==",
    "Content-Type": "application/json",
}


def normalize_reference_no(value):
    if value is None:
        return ""
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return str(value).strip()

    text = str(value).strip()
    if not text:
        return ""

    # Convert values like 5.551061944224139E+15 when Excel stores a number.
    if "e" in text.lower():
        try:
            return format(Decimal(text), "f").rstrip("0").rstrip(".")
        except InvalidOperation:
            return text
    return text


def read_reference_numbers(excel_path, sheet_name=None, skip_header=False):
    content = excel_path.read_bytes()
    if content.startswith(b"PK\x03\x04"):
        return read_excel_reference_numbers(io.BytesIO(content), sheet_name, skip_header)

    if excel_path.suffix.lower() == ".csv":
        refs = []
        text = read_csv_text(content)
        with io.StringIO(text, newline="") as file:
            reader = csv.reader(file)
            for row_index, row in enumerate(reader, start=1):
                if row_index == 1 and skip_header:
                    continue
                if not row:
                    continue
                reference_no = normalize_reference_no(row[0])
                if reference_no:
                    refs.append(reference_no)
        return refs

    return read_excel_reference_numbers(excel_path, sheet_name, skip_header)


def read_excel_reference_numbers(workbook_source, sheet_name=None, skip_header=False):
    workbook = load_workbook(workbook_source, data_only=True, read_only=True)
    sheet = workbook[sheet_name] if sheet_name else workbook.active

    refs = []
    for row_index, row in enumerate(sheet.iter_rows(min_col=1, max_col=1, values_only=True), start=1):
        if row_index == 1 and skip_header:
            continue
        reference_no = normalize_reference_no(row[0])
        if reference_no:
            refs.append(reference_no)
    workbook.close()
    return refs


def read_csv_text(content):
    for encoding in ("utf-8-sig", "utf-8", "utf-16", "utf-16-le", "utf-16-be", "gb18030", "gbk", "cp936", "cp1252", "latin1"):
        try:
            text = content.decode(encoding)
            if "\x00" in text:
                continue
            return text
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("unknown", content, 0, 1, "unable to decode csv with common encodings")


def query_order(session, reference_no, timeout):
    response = session.post(
        QUERY_URL,
        headers={
            "app-code": os.getenv("APP_CODE", DEFAULT_QUERY_HEADERS["app-code"]),
            "app-key": os.getenv("APP_KEY", DEFAULT_QUERY_HEADERS["app-key"]),
            "app-timestamp": os.getenv("APP_TIMESTAMP", DEFAULT_QUERY_HEADERS["app-timestamp"]),
            "app-sign": os.getenv("APP_SIGN", DEFAULT_QUERY_HEADERS["app-sign"]),
            "Content-Type": "application/json",
        },
        json={"referenceNo": reference_no},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()


def build_push_payload(order_data, cop_no_field):
    logistics_no = order_data.get("logisticsNo")
    payload = {
        "appTime": datetime.now().strftime("%Y%m%d%H%M%S"),
        "copNo": order_data.get(cop_no_field) or logistics_no,
        "ieDate": order_data.get("ieDate"),
        "invtNo": order_data.get("invtNo"),
        "logisticsNo": logistics_no,
    }

    missing = [key for key, value in payload.items() if not value]
    if missing:
        raise ValueError(f"missing fields for push payload: {', '.join(missing)}")
    return payload


def push_clearance_info(session, payload, timeout):
    response = session.post(
        PUSH_URL,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    try:
        return response.json()
    except ValueError:
        return {"raw": response.text}


def write_result(writer, reference_no, status, query_result=None, push_payload=None, push_result=None, error=None):
    writer.writerow(
        {
            "referenceNo": reference_no,
            "status": status,
            "queryCode": (query_result or {}).get("code", ""),
            "queryMessage": (query_result or {}).get("message", ""),
            "orderNo": ((query_result or {}).get("data") or {}).get("orderNo", ""),
            "logisticsNo": ((query_result or {}).get("data") or {}).get("logisticsNo", ""),
            "invtNo": ((query_result or {}).get("data") or {}).get("invtNo", ""),
            "ieDate": ((query_result or {}).get("data") or {}).get("ieDate", ""),
            "pushPayload": json.dumps(push_payload or {}, ensure_ascii=False),
            "pushResult": json.dumps(push_result or {}, ensure_ascii=False),
            "error": error or "",
        }
    )


def main():
    parser = argparse.ArgumentParser(description="Read reference numbers from Excel and push customs clearance info.")
    parser.add_argument("excel", help="Excel file path. Reads the first column from the active sheet by default.")
    parser.add_argument("--sheet", help="Sheet name. Defaults to the active sheet.")
    parser.add_argument("--skip-header", action="store_true", help="Skip the first row.")
    parser.add_argument("--output", help="CSV result file path. Defaults to clearance_result.csv next to the Excel file.")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout seconds. Default: 30.")
    parser.add_argument("--delay", type=float, default=0.0, help="Delay seconds between records. Default: 0.")
    parser.add_argument("--dry-run", action="store_true", help="Only query and build payload, do not call push API.")
    parser.add_argument(
        "--cop-no-field",
        default="logisticsNo",
        help="Field from query response data used as copNo. Default: logisticsNo.",
    )
    args = parser.parse_args()

    excel_path = Path(args.excel)
    if not excel_path.exists():
        raise FileNotFoundError(f"Excel file not found: {excel_path}")

    output_path = Path(args.output) if args.output else excel_path.parent / "clearance_result.csv"
    if output_path.resolve() == excel_path.resolve():
        raise ValueError(
            "Input file and output file are both clearance_result.csv. "
            "Please pass the original file that contains reference numbers, or use --output to specify another result file."
        )
    refs = read_reference_numbers(excel_path, args.sheet, args.skip_header)

    fieldnames = [
        "referenceNo",
        "status",
        "queryCode",
        "queryMessage",
        "orderNo",
        "logisticsNo",
        "invtNo",
        "ieDate",
        "pushPayload",
        "pushResult",
        "error",
    ]

    session = requests.Session()
    with output_path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()

        for index, reference_no in enumerate(refs, start=1):
            print(f"[{index}/{len(refs)}] processing {reference_no}")
            try:
                query_result = query_order(session, reference_no, args.timeout)
                if query_result.get("code") != "SYS000" or not query_result.get("data"):
                    write_result(writer, reference_no, "QUERY_FAILED", query_result=query_result)
                    continue

                push_payload = build_push_payload(query_result["data"], args.cop_no_field)
                if args.dry_run:
                    write_result(writer, reference_no, "DRY_RUN", query_result=query_result, push_payload=push_payload)
                    continue

                push_result = push_clearance_info(session, push_payload, args.timeout)
                write_result(
                    writer,
                    reference_no,
                    "DONE",
                    query_result=query_result,
                    push_payload=push_payload,
                    push_result=push_result,
                )
            except Exception as exc:
                write_result(writer, reference_no, "ERROR", error=str(exc))

            if args.delay > 0:
                time.sleep(args.delay)

    print(f"finished. result file: {output_path}")


if __name__ == "__main__":
    main()
