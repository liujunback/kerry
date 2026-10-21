from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, List

from playwright.sync_api import Page


@dataclass
class CheckResult:
    name: str
    passed: bool
    notes: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class MenuCheck:
    id: str
    menu: str
    name: str
    run: Callable[[Page], CheckResult]
