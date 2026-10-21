import pytest

from pages.home_page import HomePage
from pages.login_page import LoginPage
from utils.config import settings


@pytest.mark.ui
@pytest.mark.smoke
def test_login_success(page):
    login = LoginPage(page)
    login.open()
    login.assert_login_page_loaded()
    login.login(settings.username, settings.password)

    home = HomePage(page)
    home.assert_loaded()
