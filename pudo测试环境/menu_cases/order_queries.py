from __future__ import annotations

from typing import Callable, List, Tuple

from common import open_pickup_order, open_return_container, open_return_order

from .types import CheckResult, MenuCheck


def build_checks() -> List[MenuCheck]:
    def runner(page) -> CheckResult:
        checks: List[Tuple[str, Callable]] = [
            ("Pickup Order", open_pickup_order),
            ("Return Order", open_return_order),
            ("Return Container", open_return_container),
        ]

        failures = []
        for title, opener in checks:
            opener(page)
            headers = [text.strip() for text in page.locator("th").all_inner_texts() if text.strip()]
            print(f"{title} headers: {headers}")
            if "Pudo Code" not in headers:
                failures.append(f"{title} is missing 'Pudo Code' column.")

        return CheckResult(name="Order Lists Pudo Code", passed=len(failures) == 0, notes=failures)

    return [
        MenuCheck(
            id="pudo_code_column",
            menu="order_queries",
            name="Order Lists Pudo Code",
            run=runner,
        )
    ]
