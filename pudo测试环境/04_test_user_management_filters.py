from __future__ import annotations

import argparse
import sys

from common import login, start_session
from menu_cases.user_management import build_checks


def main() -> int:
    parser = argparse.ArgumentParser(description="Test Contact Name and Contact Email filters in User Management.")
    parser.add_argument("--contact-name", default="Rebecca test3 Zhang", help="Contact Name filter value.")
    parser.add_argument(
        "--contact-email",
        default="Rebecca.RH.Zhang@kln.com3",
        help="Contact Email filter value.",
    )
    args = parser.parse_args()

    session = start_session(headless=False)
    try:
        login(session.page)
        result = build_checks(args.contact_name, args.contact_email)[0].run(session.page)
        if not result.passed:
            for note in result.notes:
                print(f"FAIL: {note}")
            return 1

        print("PASS: Contact Name and Contact Email filters both work as expected.")
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
