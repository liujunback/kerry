from playwright.sync_api import Page, expect


APPROVAL_LIST_TEXT = "\u5ba1\u6279\u5217\u8868"


class HomePage:
    def __init__(self, page: Page) -> None:
        self.page = page

    def assert_loaded(self) -> None:
        self.page.wait_for_url("**/home")
        self.page.wait_for_selector("li.topNav", timeout=30000)
        expect(self.page.locator("#app")).to_be_visible()
        expect(self.page.get_by_text(APPROVAL_LIST_TEXT)).to_be_visible()
        assert "/login" not in self.page.url

    def _get_main_menu_index(self, menu_title: str) -> int:
        self.page.wait_for_selector("li.topNav", timeout=30000)
        index = self.page.evaluate(
            """
            (menuTitle) => Array.from(document.querySelectorAll('li.topNav')).findIndex((li) => {
              const title = li.querySelector('p span[title]')?.getAttribute('title') || '';
              return title === menuTitle;
            })
            """,
            menu_title,
        )
        if index < 0:
            raise ValueError(f"Main menu not found: {menu_title}")
        return index

    def _get_sub_menu_index(self, main_menu_index: int, sub_menu_title: str) -> int:
        sub_index = self.page.evaluate(
            """
            ({ mainMenuIndex, subMenuTitle }) => {
              const menu = document.querySelectorAll('li.topNav')[mainMenuIndex];
              if (!menu) return -1;
              return Array.from(menu.querySelectorAll('li.dk')).findIndex((li) => {
                const title = li.querySelector('p span[title]')?.getAttribute('title') || '';
                return title === subMenuTitle;
              });
            }
            """,
            {"mainMenuIndex": main_menu_index, "subMenuTitle": sub_menu_title},
        )
        if sub_index < 0:
            raise ValueError(f"Sub menu not found: {sub_menu_title}")
        return sub_index

    def open_side_menu_by_index(self, main_menu_index: int, sub_menu_index: int) -> None:
        self.assert_loaded()
        self.page.evaluate(
            """
            (mainMenuIndex) => {
              const menu = document.querySelectorAll('li.topNav')[mainMenuIndex];
              const trigger = menu?.querySelectorAll('p')[1];
              if (!trigger) {
                throw new Error(`Main menu trigger not found: ${mainMenuIndex}`);
              }
              trigger.scrollIntoView({ block: 'center' });
              trigger.click();
            }
            """,
            main_menu_index,
        )
        self.page.wait_for_timeout(500)
        self.page.evaluate(
            """
            ({ mainMenuIndex, subMenuIndex }) => {
              const menu = document.querySelectorAll('li.topNav')[mainMenuIndex];
              const subMenu = menu?.querySelectorAll('li.dk')[subMenuIndex];
              const trigger = subMenu?.querySelectorAll('p')[1];
              if (!trigger) {
                throw new Error(`Sub menu trigger not found: ${mainMenuIndex}/${subMenuIndex}`);
              }
              trigger.scrollIntoView({ block: 'center' });
              trigger.click();
            }
            """,
            {"mainMenuIndex": main_menu_index, "subMenuIndex": sub_menu_index},
        )

    def open_side_menu(self, main_menu_title: str, sub_menu_title: str) -> None:
        main_index = self._get_main_menu_index(main_menu_title)
        sub_index = self._get_sub_menu_index(main_index, sub_menu_title)
        self.open_side_menu_by_index(main_index, sub_index)

    def open_home_shortcut(self, shortcut_title: str) -> None:
        self.page.locator(".home-font").filter(has_text=shortcut_title).first.click()
