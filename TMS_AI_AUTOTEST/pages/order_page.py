from playwright.sync_api import Page, expect

from pages.home_page import HomePage


ORDER_MENU_TEXT = "\u8ba2\u5355"
ORDER_PREALERT_TEXT = "\u8ba2\u5355\u9884\u62a5"
QUERY_BUTTON_TEXT = "\u67e5\u8be2"


class OrderPage:
    def __init__(self, page: Page) -> None:
        self.page = page

    def open_order_prealert(self) -> None:
        home = HomePage(self.page)
        home.open_side_menu(ORDER_MENU_TEXT, ORDER_PREALERT_TEXT)
        self.page.wait_for_url("**/order/orderprediction")

    def assert_order_prealert_loaded(self) -> None:
        assert "/order/orderprediction" in self.page.url
        expect(self.page.locator("body")).to_contain_text(ORDER_PREALERT_TEXT)
        expect(self.page.get_by_role("button", name=QUERY_BUTTON_TEXT)).to_be_visible()
        expect(self.page.locator("table").first).to_be_visible()

    def run_query(self) -> None:
        self.page.get_by_role("button", name=QUERY_BUTTON_TEXT).click(force=True)
