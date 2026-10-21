import os
import sys
import unittest
from datetime import datetime

from BeautifulReport import BeautifulReport

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from unittest_suite.tests.probe_unexpected_pass_cases import ProbeUnexpectedPassCases


def build_suite() -> unittest.TestSuite:
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(ProbeUnexpectedPassCases))
    return suite


def main():
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    reports_dir = os.path.join(CURRENT_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    filename = f"unexpected_pass_probe_report_{stamp}.html"
    report = BeautifulReport(build_suite())
    report.report(
        description="Unexpected Pass 探针报告",
        filename=filename,
        report_dir=reports_dir,
        theme="theme_default",
    )


if __name__ == "__main__":
    main()
