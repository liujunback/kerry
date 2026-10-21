import pytest
from playwright.sync_api import expect

from data.navigation_cases import ALL_NAVIGATION_CASES, SMOKE_NAVIGATION_CASES, NavigationCase
from pages.home_page import HomePage


def _assert_navigation_result(logged_in_page, case: NavigationCase) -> None:
    home = HomePage(logged_in_page)
    home.open_side_menu_by_index(case.main_index, case.sub_index)
    logged_in_page.wait_for_timeout(1500)

    assert "/home" not in logged_in_page.url
    if case.expected_path:
        assert case.expected_path in logged_in_page.url
    else:
        expect(logged_in_page.locator("body")).to_contain_text(case.sub_title)


@pytest.mark.ui
@pytest.mark.smoke
@pytest.mark.parametrize(
    "case",
    SMOKE_NAVIGATION_CASES,
    ids=[f"{case.main_title}-{case.sub_title}" for case in SMOKE_NAVIGATION_CASES],
)
def test_navigation_smoke(logged_in_page, case: NavigationCase):
    _assert_navigation_result(logged_in_page, case)


@pytest.mark.ui
@pytest.mark.navigation
@pytest.mark.parametrize(
    "case",
    ALL_NAVIGATION_CASES,
    ids=[f"{case.main_title}-{case.sub_title}" for case in ALL_NAVIGATION_CASES],
)
def test_navigation_matrix(logged_in_page, case: NavigationCase):
    _assert_navigation_result(logged_in_page, case)
