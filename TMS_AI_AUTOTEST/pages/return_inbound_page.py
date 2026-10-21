from playwright.sync_api import Page, expect

from pages.home_page import HomePage


OPERATE_MENU_TEXT = "\u64cd\u4f5c"
RETURN_INBOUND_TEXT = "\u9000\u4ef6\u5165\u5e93"
RETURN_INBOUND_MANAGE_TEXT = "\u9000\u4ef6\u5165\u5e93\u7ba1\u7406"
BATCH_SCAN_TEXT = "\u6279\u91cf\u626b\u63cf"
SCAN_LABEL_TEXT = "\u626b\u63cf\u5355\u53f7"


class ReturnInboundPage:
    def __init__(self, page: Page) -> None:
        self.page = page

    def open(self) -> None:
        home = HomePage(self.page)
        home.open_side_menu(OPERATE_MENU_TEXT, RETURN_INBOUND_TEXT)
        self.page.wait_for_url("**/bounce/bouncewarehousing")

    def assert_loaded(self) -> None:
        assert "/bounce/bouncewarehousing" in self.page.url
        expect(self.page.get_by_role("button", name=BATCH_SCAN_TEXT)).to_be_visible()
        expect(self.page.get_by_role("button", name=RETURN_INBOUND_MANAGE_TEXT)).to_be_visible()
        expect(self.page.locator("body")).to_contain_text(SCAN_LABEL_TEXT)

    def open_manage_page(self) -> None:
        self.page.get_by_role("button", name=RETURN_INBOUND_MANAGE_TEXT).click()
        self.page.wait_for_timeout(1500)

