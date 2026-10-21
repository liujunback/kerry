from playwright.sync_api import Page, expect

from pages.home_page import HomePage


OPERATE_MENU_TEXT = "\u64cd\u4f5c"
RETURN_CUSTOMER_TEXT = "\u9000\u8fd4\u5ba2\u6237"
QUERY_BUTTON_TEXT = "\u67e5\u8be2"
REFERENCE_COLUMN_TEXT = "\u53c2\u8003\u7f16\u53f7"
RETURN_RESULT_TEXT = "\u5904\u7406\u7ed3\u679c"


class ReturnCustomerPage:
    def __init__(self, page: Page) -> None:
        self.page = page

    def open(self) -> None:
        home = HomePage(self.page)
        home.open_side_menu(OPERATE_MENU_TEXT, RETURN_CUSTOMER_TEXT)
        self.page.wait_for_url("**/bounce/returncustomer")

    def assert_loaded(self) -> None:
        assert "/bounce/returncustomer" in self.page.url
        expect(self.page.get_by_role("button", name=QUERY_BUTTON_TEXT)).to_be_visible()
        expect(self.page.locator("body")).to_contain_text(RETURN_RESULT_TEXT)
        expect(self.page.locator("body")).to_contain_text(REFERENCE_COLUMN_TEXT)
        expect(self.page.locator("table").first).to_be_visible()

    def run_query(self) -> None:
        self.page.get_by_role("button", name=QUERY_BUTTON_TEXT).click(force=True)
