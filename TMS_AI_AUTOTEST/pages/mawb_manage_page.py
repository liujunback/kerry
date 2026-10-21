from playwright.sync_api import Page, expect

from pages.home_page import HomePage


TRUNK_MENU_TEXT = "\u5e72\u7ebf"
MAWB_TEXT = "\u603b\u8fd0\u5355\u7ba1\u7406"
QUERY_BUTTON_TEXT = "\u67e5\u8be2"
RESET_BUTTON_TEXT = "\u91cd\u7f6e"
MAWB_NO_TEXT = "\u603b\u8fd0\u5355\u53f7"


class MawbManagePage:
    def __init__(self, page: Page) -> None:
        self.page = page

    def open(self) -> None:
        home = HomePage(self.page)
        home.open_side_menu(TRUNK_MENU_TEXT, MAWB_TEXT)
        self.page.wait_for_url("**/shipment/managewaybill")

    def assert_loaded(self) -> None:
        assert "/shipment/managewaybill" in self.page.url
        expect(self.page.get_by_role("button", name=QUERY_BUTTON_TEXT)).to_be_visible()
        expect(self.page.get_by_role("button", name=RESET_BUTTON_TEXT)).to_be_visible()
        expect(self.page.locator("body")).to_contain_text(MAWB_NO_TEXT)
        expect(self.page.locator("table").first).to_be_visible()

    def run_query(self) -> None:
        self.page.get_by_role("button", name=QUERY_BUTTON_TEXT).click(force=True)
