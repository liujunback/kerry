from playwright.sync_api import Page, expect

from pages.home_page import HomePage


WAYBILL_MENU_TEXT = "\u64cd\u4f5c"
WAYBILL_PAGE_TEXT = "\u8fd0\u5355\u7ba1\u7406"
QUERY_BUTTON_TEXT = "\u67e5\u8be2"
RESET_BUTTON_TEXT = "\u91cd\u7f6e"
REFERENCE_COLUMN_TEXT = "\u53c2\u8003\u7f16\u53f7"


class WaybillManagePage:
    def __init__(self, page: Page) -> None:
        self.page = page

    def open(self) -> None:
        home = HomePage(self.page)
        home.open_side_menu(WAYBILL_MENU_TEXT, WAYBILL_PAGE_TEXT)
        self.page.wait_for_url("**/manifestmanage/manifestmanage")

    def assert_loaded(self) -> None:
        assert "/manifestmanage/manifestmanage" in self.page.url
        expect(self.page.get_by_role("button", name=QUERY_BUTTON_TEXT)).to_be_visible()
        expect(self.page.get_by_role("button", name=RESET_BUTTON_TEXT)).to_be_visible()
        expect(self.page.locator("body")).to_contain_text(REFERENCE_COLUMN_TEXT)
        expect(self.page.locator("table").first).to_be_visible()

    def run_query(self) -> None:
        self.page.get_by_role("button", name=QUERY_BUTTON_TEXT).click(force=True)
