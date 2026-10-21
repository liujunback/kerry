from common import start_session, login, wait_for_enter


def main() -> None:
    session = start_session(headless=False)
    try:
        login(session.page)
        print("Browser is open and logged in.")
        wait_for_enter("Press Enter in this terminal to close the browser...")
    finally:
        session.close()


if __name__ == "__main__":
    main()
