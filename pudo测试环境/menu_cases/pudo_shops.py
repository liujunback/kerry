from __future__ import annotations

import json
from datetime import datetime
from typing import Dict, List

from common import (
    get_detail_value,
    get_modal_input,
    modal_by_title,
    open_pudo_shops,
    open_shop_details,
)

from .types import CheckResult, MenuCheck


EDITABLE_FIELDS = [
    "Country",
    "Shop Name",
    "Business Name",
    "Address",
    "City",
    "Province",
    "Postcode",
    "CIF / NIF",
    "Email",
    "Landline",
    "Mobile",
    "Bank Account (IBAN)",
    "Max Package Capacity",
    "Storage Area (m²)",
    "Latitude",
    "Longitude",
]


def _capture_edit_values(edit_modal) -> Dict[str, str]:
    values = {}
    for label in EDITABLE_FIELDS:
        values[label] = get_modal_input(edit_modal, label).input_value()
    return values


def _fill_edit_values(edit_modal, values: Dict[str, str]) -> None:
    for label, value in values.items():
        field = get_modal_input(edit_modal, label)
        field.click()
        field.press("Control+A")
        field.fill(value or "")


def _save_and_watch(page, edit_modal):
    requests = []
    responses = []

    def on_request(req):
        if req.method != "GET" and "/api/admin/pudo-shops" in req.url:
            requests.append({"method": req.method, "url": req.url})

    def on_response(res):
        if res.request.method != "GET" and "/api/admin/pudo-shops" in res.url:
            responses.append(
                {
                    "status": res.status,
                    "url": res.url,
                    "method": res.request.method,
                }
            )

    page.on("request", on_request)
    page.on("response", on_response)
    edit_modal.get_by_role("button", name="Save").click()
    page.wait_for_timeout(3000)
    return requests, responses


def check_detail_buttons(shop_code: str) -> MenuCheck:
    def runner(page) -> CheckResult:
        open_pudo_shops(page)
        detail_modal = open_shop_details(page, shop_code)
        buttons = [
            text.strip()
            for text in detail_modal.get_by_role("button").all_inner_texts()
            if text.strip()
        ]
        actual = [text for text in buttons if text in {"Delete", "Edit", "Close"}]
        expected = ["Delete", "Edit", "Close"]

        print(f"Shop code: {shop_code}")
        print(f"Button order: {actual}")
        if actual != expected:
            return CheckResult(
                name="PUDO Shop Details Buttons",
                passed=False,
                notes=[f"Expected button order {expected}, got {actual}."],
            )

        return CheckResult(name="PUDO Shop Details Buttons", passed=True)

    return MenuCheck(
        id="detail_buttons",
        menu="pudo_shops",
        name="PUDO Shop Details Buttons",
        run=runner,
    )


def check_edit_flow(shop_code: str) -> MenuCheck:
    def runner(page) -> CheckResult:
        warnings: List[str] = []

        open_pudo_shops(page)
        detail_modal = open_shop_details(page, shop_code)
        original_detail = {
            "Shop Name": get_detail_value(detail_modal, "Shop Name"),
            "Landline": get_detail_value(detail_modal, "Landline"),
            "Mobile": get_detail_value(detail_modal, "Mobile"),
        }
        print("Original detail values:")
        print(json.dumps(original_detail, ensure_ascii=False, indent=2))

        detail_modal.get_by_role("button", name="Edit").click()
        page.wait_for_timeout(1000)
        edit_modal = modal_by_title(page, "Edit PUDO Shop")
        original_edit_values = _capture_edit_values(edit_modal)

        timestamp = datetime.now().strftime("%H%M%S")
        temp_name = f"{original_edit_values['Shop Name']} QA {timestamp}"
        get_modal_input(edit_modal, "Shop Name").fill(temp_name)

        update_requests, update_responses = _save_and_watch(page, edit_modal)
        detail_modal = modal_by_title(page, "PUDO Shop Details")
        updated_name = get_detail_value(detail_modal, "Shop Name")
        updated_landline = get_detail_value(detail_modal, "Landline")

        print("Update request log:")
        print(json.dumps(update_requests, ensure_ascii=False, indent=2))
        print(json.dumps(update_responses, ensure_ascii=False, indent=2))

        if updated_name != temp_name:
            return CheckResult(
                name="PUDO Shop Edit",
                passed=False,
                notes=[f"Shop Name update failed. Expected {temp_name}, got {updated_name}."],
            )

        detail_modal.get_by_role("button", name="Edit").click()
        page.wait_for_timeout(1000)
        edit_modal = modal_by_title(page, "Edit PUDO Shop")
        _fill_edit_values(edit_modal, original_edit_values)

        restore_requests, restore_responses = _save_and_watch(page, edit_modal)
        detail_modal = modal_by_title(page, "PUDO Shop Details")
        restored_name = get_detail_value(detail_modal, "Shop Name")
        restored_landline = get_detail_value(detail_modal, "Landline")

        print("Restore request log:")
        print(json.dumps(restore_requests, ensure_ascii=False, indent=2))
        print(json.dumps(restore_responses, ensure_ascii=False, indent=2))

        if restored_name != original_detail["Shop Name"]:
            return CheckResult(
                name="PUDO Shop Edit",
                passed=False,
                notes=[
                    "Shop Name restore failed. "
                    f"Expected {original_detail['Shop Name']}, got {restored_name}."
                ],
            )

        if (
            updated_landline != original_detail["Landline"]
            or restored_landline != original_detail["Landline"]
        ):
            warnings.append(
                "Landline changed during edit flow. "
                f"Original={original_detail['Landline']}, "
                f"after_update={updated_landline}, restored={restored_landline}."
            )

        return CheckResult(name="PUDO Shop Edit", passed=True, notes=warnings)

    return MenuCheck(
        id="edit_flow",
        menu="pudo_shops",
        name="PUDO Shop Edit",
        run=runner,
    )


def build_checks(shop_code: str) -> List[MenuCheck]:
    return [check_detail_buttons(shop_code), check_edit_flow(shop_code)]
