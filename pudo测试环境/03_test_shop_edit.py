import argparse
import sys

from common import DEFAULT_SHOP_CODE, login, start_session
from menu_cases.pudo_shops import build_checks


def main() -> int:
    parser = argparse.ArgumentParser(description="Test PUDO Shop Edit flow.")
    parser.add_argument("--shop-code", default=DEFAULT_SHOP_CODE, help="Target PUDO shop code.")
    args = parser.parse_args()

    session = start_session(headless=False)
    try:
        login(session.page)
        result = build_checks(args.shop_code)[1].run(session.page)
        if not result.passed:
            for note in result.notes:
                print(f"FAIL: {note}")
            return 1

        print("PASS: PUDO Shop edit flow completed.")
        for note in result.notes:
            print(f"WARNING: {note}")
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
