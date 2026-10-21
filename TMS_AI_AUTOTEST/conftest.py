from pathlib import Path
import sys

import pytest
from playwright.sync_api import sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pages.login_page import LoginPage
from utils.config import settings


def pytest_configure() -> None:
    Path("artifacts/screenshots").mkdir(parents=True, exist_ok=True)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=settings.headless)
        yield browser
        browser.close()


@pytest.fixture
def context(browser):
    context = browser.new_context(base_url=settings.base_url)
    yield context
    context.close()


@pytest.fixture
def page(context, request):
    page = context.new_page()
    page.set_default_timeout(settings.timeout_ms)
    yield page

    rep = getattr(request.node, "rep_call", None)
    if rep and rep.failed:
        screenshot = Path("artifacts/screenshots") / f"{request.node.name}.png"
        page.screenshot(path=str(screenshot), full_page=True)
    page.close()


@pytest.fixture
def logged_in_page(page):
    login = LoginPage(page)
    login.open()
    login.login(settings.username, settings.password)
    return page
