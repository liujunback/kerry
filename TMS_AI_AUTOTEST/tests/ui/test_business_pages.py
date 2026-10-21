import pytest
from playwright.sync_api import expect

from pages.mawb_manage_page import MawbManagePage
from pages.order_page import OrderPage
from pages.return_customer_page import ReturnCustomerPage
from pages.return_inbound_page import ReturnInboundPage
from pages.waybill_manage_page import WaybillManagePage


@pytest.mark.ui
def test_order_prealert_query_by_reference(logged_in_page):
    order_page = OrderPage(logged_in_page)
    order_page.open_order_prealert()
    order_page.assert_order_prealert_loaded()
    order_page.run_query()
    expect(logged_in_page.locator("body")).to_contain_text("\u53c2\u8003\u7f16\u53f7")


@pytest.mark.ui
def test_waybill_manage_query(logged_in_page):
    page = WaybillManagePage(logged_in_page)
    page.open()
    page.assert_loaded()
    page.run_query()
    expect(logged_in_page.locator("body")).to_contain_text("\u53c2\u8003\u7f16\u53f7")


@pytest.mark.ui
def test_return_customer_query(logged_in_page):
    page = ReturnCustomerPage(logged_in_page)
    page.open()
    page.assert_loaded()
    page.run_query()
    expect(logged_in_page.locator("body")).to_contain_text("\u5904\u7406\u7ed3\u679c")


@pytest.mark.ui
def test_return_inbound_pages(logged_in_page):
    page = ReturnInboundPage(logged_in_page)
    page.open()
    page.assert_loaded()
    page.open_manage_page()
    expect(logged_in_page.locator("body")).to_contain_text("\u9000\u4ef6\u5165\u5e93\u7ba1\u7406")


@pytest.mark.ui
def test_mawb_manage_query(logged_in_page):
    page = MawbManagePage(logged_in_page)
    page.open()
    page.assert_loaded()
    page.run_query()
    expect(logged_in_page.locator("body")).to_contain_text("\u603b\u8fd0\u5355\u53f7")
