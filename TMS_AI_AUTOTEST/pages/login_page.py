from playwright.sync_api import Page, expect


USERNAME_PLACEHOLDER = "\u8bf7\u8f93\u5165\u7528\u6237\u540d"
PASSWORD_PLACEHOLDER = "\u8bf7\u8f93\u5165\u5bc6\u7801"
LOGIN_BUTTON_TEXT = "\u767b \u5f55"
LOGIN_BANNER_TEXT = "\u6b22\u8fce\u767b\u9646 \u8de8\u5883V5 \u4e91\u5e73\u53f0"


class LoginPage:
    def __init__(self, page: Page) -> None:
        self.page = page

    def open(self) -> None:
        self.page.goto("/login", wait_until="domcontentloaded")

    def login(self, username: str, password: str) -> None:
        self.page.get_by_placeholder(USERNAME_PLACEHOLDER).fill(username)
        self.page.get_by_placeholder(PASSWORD_PLACEHOLDER).fill(password)
        self.page.get_by_role("button", name=LOGIN_BUTTON_TEXT).click()

    def assert_login_page_loaded(self) -> None:
        expect(self.page.locator("#app")).to_be_visible()
        expect(self.page.get_by_text(LOGIN_BANNER_TEXT)).to_be_visible()
        assert "/login" in self.page.url

    def assert_login_success(self) -> None:
        self.page.wait_for_url("**/home")
        assert "/login" not in self.page.url
