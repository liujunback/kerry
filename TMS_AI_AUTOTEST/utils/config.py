import os
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv


# Let the project-local .env override inherited shell/system variables.
load_dotenv(override=True)


def _to_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    base_url: str = os.getenv("BASE_URL", "https://tms-kec-eng-uat.kec-app.com")
    username: str = os.getenv("USERNAME", "")
    password: str = os.getenv("PASSWORD", "")
    headless: bool = _to_bool(os.getenv("HEADLESS"), default=False)
    timeout_ms: int = int(os.getenv("TIMEOUT_MS", "15000"))


settings = Settings()
