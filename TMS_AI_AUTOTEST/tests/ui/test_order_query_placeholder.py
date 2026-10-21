import pytest

from pages.order_page import OrderPage


@pytest.mark.ui
def test_order_prealert_menu_navigation(logged_in_page):
    order_page = OrderPage(logged_in_page)
    order_page.open_order_prealert()
    order_page.assert_order_prealert_loaded()
