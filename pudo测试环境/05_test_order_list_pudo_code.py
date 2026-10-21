from __future__ import annotations

import sys

from common import login, start_session
from menu_cases.order_queries import build_checks


def main() -> int:
    session = start_session(headless=False)
    try:
        login(session.page)
        result = build_checks()[0].run(session.page)
        if not result.passed:
            for note in result.notes:
                print(f"FAIL: {note}")
            return 1

        print("PASS: Pickup Order, Return Order, and Return Container all contain 'Pudo Code'.")
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
