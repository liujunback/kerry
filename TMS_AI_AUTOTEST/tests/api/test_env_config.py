import pytest
import requests

from utils.config import settings


@pytest.mark.api
def test_login_page_is_reachable():
    response = requests.get(f"{settings.base_url}/login", timeout=15)
    assert response.status_code == 200
    assert "<div id=app></div>" in response.text

