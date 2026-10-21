from __future__ import annotations

from typing import Dict, List

from .order_queries import build_checks as build_order_query_checks
from .pudo_shops import build_checks as build_pudo_shop_checks
from .types import MenuCheck
from .user_management import build_checks as build_user_management_checks


MENU_LABELS: Dict[str, str] = {
    "pudo_shops": "PUDO Shops",
    "user_management": "User Management",
    "order_queries": "Order Queries",
}


def build_checks(
    *,
    menu: str,
    shop_code: str,
    contact_name: str,
    contact_email: str,
) -> List[MenuCheck]:
    builders = {
        "pudo_shops": lambda: build_pudo_shop_checks(shop_code),
        "user_management": lambda: build_user_management_checks(contact_name, contact_email),
        "order_queries": build_order_query_checks,
    }

    if menu == "all":
        checks: List[MenuCheck] = []
        for key in MENU_LABELS:
            checks.extend(builders[key]())
        return checks

    if menu not in builders:
        raise ValueError(f"Unsupported menu: {menu}")

    return builders[menu]()


def describe_checks(
    *,
    shop_code: str,
    contact_name: str,
    contact_email: str,
) -> Dict[str, List[str]]:
    descriptions: Dict[str, List[str]] = {}
    for menu in MENU_LABELS:
        descriptions[menu] = [
            check.name
            for check in build_checks(
                menu=menu,
                shop_code=shop_code,
                contact_name=contact_name,
                contact_email=contact_email,
            )
        ]
    return descriptions
