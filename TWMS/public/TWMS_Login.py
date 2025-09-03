import json
import random
import re
import datetime
import requests
from requests.exceptions import RequestException


def Twms_login(properties):
    url = properties["TWMS_URL"].rstrip('/')  # Normalize URL by removing trailing slash
    username = properties["twms_username"]
    password = properties["twms_password"]

    session = requests.Session()  # Use a session to manage cookies automatically
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    session.headers.update(headers)

    try:
        # Fetch login page
        res1 = session.get(url + '/opt/login', timeout=10)
        res1.raise_for_status()  # Raise exception for HTTP errors

        # Extract CSRF token from the form
        token_match = re.search(r'name="_token" value="([^"]+)"', res1.text)
        if not token_match:
            raise ValueError("CSRF token not found in login form")
        c_token = token_match.group(1)

        # Prepare login payload
        payload = {
            "username": username,
            "password": password,
            "_token": c_token
        }

        # Submit login request
        login_response = session.post(url + '/opt/login', data=payload, timeout=10)
        login_response.raise_for_status()

        # Check for successful login
        if "Logout" not in login_response.text:
            raise ValueError("Login failed: Invalid credentials or session issue")

        # Extract tokens from session cookies and response headers
        xsrf_token = session.cookies.get('XSRF-TOKEN')
        laravel_session = session.cookies.get('laravel_session')

        csrf_token_match = re.search(r'<meta name="csrf-token" content="([^"]+)">', login_response.text)
        csrf_token = csrf_token_match.group(1) if csrf_token_match else None

        print("Login successful")
        return {
            "cookies": {
                "XSRF-TOKEN": xsrf_token,
                "laravel_session": laravel_session
            },
            "_token": c_token,
            "csrf_token": csrf_token
        }

    except RequestException as e:
        print(f"Network error during login: {e}")
        raise
    except ValueError as e:
        print(f"Login error: {e}")
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise