from __future__ import annotations

import re
from typing import List, Optional, Tuple

from common import open_user_management

from .types import CheckResult, MenuCheck


def _result_count(page) -> Optional[int]:
    body = page.locator("body").inner_text(timeout=10000)
    match = re.search(r"Showing\s+\d+\s+to\s+\d+\s+of\s+(\d+)\s+results", body)
    return int(match.group(1)) if match else None


def _run_filter(page, *, name: str = "", email: str = "") -> Tuple[Optional[int], str]:
    page.get_by_role("button", name="Reset").click()
    page.wait_for_load_state("networkidle", timeout=30000)
    page.wait_for_timeout(1000)

    if name:
        page.locator("input[placeholder='Search by contact name']").fill(name)
    if email:
        page.locator("input[placeholder='Search by contact email']").fill(email)

    page.get_by_role("button", name="Search").click()
    page.wait_for_load_state("networkidle", timeout=30000)
    page.wait_for_timeout(1000)

    body = page.locator("body").inner_text(timeout=10000)
    return _result_count(page), body


def build_checks(contact_name: str, contact_email: str) -> List[MenuCheck]:
    def runner(page) -> CheckResult:
        open_user_management(page)

        name_count, name_body = _run_filter(page, name=contact_name)
        print(f"Contact Name filter count: {name_count}")
        if name_count != 1 or contact_name not in name_body:
            return CheckResult(
                name="User Management Filters",
                passed=False,
                notes=[f"Contact Name filter did not isolate {contact_name}."],
            )

        email_count, email_body = _run_filter(page, email=contact_email)
        print(f"Contact Email filter count: {email_count}")
        if email_count != 1 or contact_email not in email_body:
            return CheckResult(
                name="User Management Filters",
                passed=False,
                notes=[f"Contact Email filter did not isolate {contact_email}."],
            )

        combined_count, combined_body = _run_filter(page, name=contact_name, email=contact_email)
        print(f"Combined filter count: {combined_count}")
        if (
            combined_count != 1
            or contact_name not in combined_body
            or contact_email not in combined_body
        ):
            return CheckResult(
                name="User Management Filters",
                passed=False,
                notes=["Combined Contact Name + Contact Email filters did not narrow to one expected result."],
            )

        return CheckResult(name="User Management Filters", passed=True)

    return [
        MenuCheck(
            id="contact_filters",
            menu="user_management",
            name="User Management Filters",
            run=runner,
        )
    ]
