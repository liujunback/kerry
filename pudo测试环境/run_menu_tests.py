from __future__ import annotations

import argparse
import sys
from typing import List, Tuple

from common import DEFAULT_SHOP_CODE, login, start_session
from menu_cases import MENU_LABELS, build_checks, describe_checks


def _print_summary(summary: List[Tuple[str, str, bool, List[str]]]) -> int:
    print("\n=== Summary ===")
    overall = True
    for menu_label, check_name, passed, notes in summary:
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {menu_label} / {check_name}")
        if not passed:
            overall = False
        for note in notes:
            print(f"  - {note}")
    return 0 if overall else 1


def main(argv=None, default_menu: str = "all") -> int:
    parser = argparse.ArgumentParser(description="Run PUDO portal checks by menu.")
    parser.add_argument(
        "--menu",
        default=default_menu,
        choices=["all"] + list(MENU_LABELS.keys()),
        help="Choose one menu group or run all.",
    )
    parser.add_argument("--shop-code", default=DEFAULT_SHOP_CODE, help="Target PUDO shop code.")
    parser.add_argument("--contact-name", default="Rebecca test3 Zhang", help="Contact Name filter value.")
    parser.add_argument(
        "--contact-email",
        default="Rebecca.RH.Zhang@kln.com3",
        help="Contact Email filter value.",
    )
    parser.add_argument("--list", action="store_true", help="List available menu groups and checks.")
    args = parser.parse_args(argv)

    descriptions = describe_checks(
        shop_code=args.shop_code,
        contact_name=args.contact_name,
        contact_email=args.contact_email,
    )
    if args.list:
        print("Available menu checks:")
        for menu, names in descriptions.items():
            print(f"- {menu} ({MENU_LABELS[menu]})")
            for name in names:
                print(f"  - {name}")
        return 0

    checks = build_checks(
        menu=args.menu,
        shop_code=args.shop_code,
        contact_name=args.contact_name,
        contact_email=args.contact_email,
    )

    session = start_session(headless=False)
    summary: List[Tuple[str, str, bool, List[str]]] = []
    try:
        page = session.page
        login(page)

        for check in checks:
            menu_label = MENU_LABELS.get(check.menu, check.menu)
            print(f"\n=== {menu_label} / {check.name} ===")
            result = check.run(page)
            summary.append((menu_label, result.name, result.passed, result.notes))
            print("PASS" if result.passed else "FAIL")
            for note in result.notes:
                prefix = "WARNING" if result.passed else "DETAIL"
                print(f"{prefix}: {note}")

        return _print_summary(summary)
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
