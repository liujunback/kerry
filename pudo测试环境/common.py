from __future__ import annotations

import os
import time
from pathlib import Path

from playwright.sync_api import Browser, Locator, Page, Playwright, sync_playwright


BASE_URL = os.getenv("PUDO_BASE_URL", "https://pudo-portal-test.parcelbox.net")
LOGIN_URL = f"{BASE_URL}/login"
EMAIL = os.getenv("PUDO_EMAIL", "admin@pudo.com")
PASSWORD = os.getenv("PUDO_PASSWORD", "yHCwrsu76mZk@2N")
EDGE_PATH = os.getenv(
    "PUDO_EDGE_PATH",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
)
DEFAULT_SHOP_CODE = os.getenv("PUDO_SHOP_CODE", "ES493276")
WAIT_FOR_BOT_SECONDS = int(os.getenv("PUDO_BOT_TIMEOUT", "180"))
WAIT_FOR_MANUAL_SECONDS = int(os.getenv("PUDO_MANUAL_WAIT", "300"))


class Session:
    def __init__(self, playwright: Playwright, browser: Browser, page: Page) -> None:
        self.playwright = playwright
        self.browser = browser
        self.page = page

    def close(self) -> None:
        self.browser.close()
        self.playwright.stop()


def start_session(headless: bool = False) -> Session:
    playwright = sync_playwright().start()
    launch_kwargs = {
        "headless": headless,
        "args": ["--start-maximized"],
    }
    edge = Path(EDGE_PATH)
    if edge.exists():
        launch_kwargs["executable_path"] = str(edge)
    browser = playwright.chromium.launch(**launch_kwargs)
    context = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 1000})
    page = context.new_page()
    return Session(playwright, browser, page)


def login(page: Page) -> None:
    page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=60000)
    page.locator("input[name='email']").fill(EMAIL)
    page.locator("input[name='password']").fill(PASSWORD)

    sign_in = page.get_by_role("button", name="Sign In")
    token_input = page.locator("input[name='cf-turnstile-response']")

    print("Waiting for robot verification to finish...")
    for second in range(1, WAIT_FOR_BOT_SECONDS + 1):
        token = ""
        try:
            token = token_input.input_value(timeout=1000)
        except Exception:
            token = ""

        disabled = True
        try:
            disabled = sign_in.is_disabled(timeout=1000)
        except Exception:
            disabled = True

        print(f"[bot] {second:03d}s disabled={disabled} token_len={len(token)}")
        if not disabled:
            sign_in.click()
            page.wait_for_load_state("networkidle", timeout=60000)
            print(f"Logged in, current URL: {page.url}")
            return
        page.wait_for_timeout(1000)

    print(
        "Robot verification did not auto-finish. "
        "You can complete it manually in the visible browser window."
    )
    for second in range(1, WAIT_FOR_MANUAL_SECONDS + 1):
        disabled = True
        try:
            disabled = sign_in.is_disabled(timeout=1000)
        except Exception:
            disabled = True
        print(f"[manual] {second:03d}s disabled={disabled}")
        if not disabled:
            sign_in.click()
            page.wait_for_load_state("networkidle", timeout=60000)
            print(f"Logged in, current URL: {page.url}")
            return
        page.wait_for_timeout(1000)

    raise TimeoutError(
        "Sign In button stayed disabled after both automatic and manual wait windows."
    )


def open_pudo_shops(page: Page) -> None:
    page.goto(f"{BASE_URL}/pudo-shops", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(1000)


def open_user_management(page: Page) -> None:
    page.goto(f"{BASE_URL}/user", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(1000)


def open_pickup_order(page: Page) -> None:
    page.goto(f"{BASE_URL}/operations/order-query", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(1000)


def open_return_order(page: Page) -> None:
    page.goto(f"{BASE_URL}/operations/return-order-query", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(1000)


def open_return_container(page: Page) -> None:
    page.goto(f"{BASE_URL}/operations/return-box-query", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(1000)


def row_by_shop_code(page: Page, shop_code: str) -> Locator:
    return page.locator("table tbody tr").filter(has=page.get_by_text(shop_code, exact=True)).first


def modal_by_title(page: Page, title: str) -> Locator:
    title_node = page.get_by_text(title, exact=True).last
    return title_node.locator('xpath=ancestor::div[contains(@class,"fixed")][1]')


def open_shop_details(page: Page, shop_code: str) -> Locator:
    row = row_by_shop_code(page, shop_code)
    if row.count() == 0:
        raise ValueError(f"Could not find shop row for code: {shop_code}")
    row.click(timeout=10000)
    page.wait_for_timeout(1000)
    return modal_by_title(page, "PUDO Shop Details")


def get_modal_input(modal: Locator, label: str) -> Locator:
    return modal.locator(
        f'xpath=.//label[normalize-space()="{label}"]/following-sibling::*[self::input or self::textarea or self::select][1]'
    )


def get_detail_value(modal: Locator, label: str) -> str:
    node = modal.locator(
        f'xpath=.//*[normalize-space()="{label}"]/following-sibling::*[1]'
    ).first
    return node.inner_text().strip()


def wait_for_enter(message: str) -> None:
    try:
        input(message)
    except EOFError:
        time.sleep(5)
