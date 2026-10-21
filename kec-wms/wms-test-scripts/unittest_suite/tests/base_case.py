import json
import time
import unittest

from common import WmsSession, get_config

from ..context import MainFlowContext


class MainFlowBaseCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.session = WmsSession(get_config())
        cls.session.login()
        cls.context = MainFlowContext(unique_tag=str(int(time.time() * 1000)))

    def build_report_json_data(self):
        context = getattr(self.__class__, "context", None)
        if not context:
            return {}
        return {
            "context": {
                "unique_tag": getattr(context, "unique_tag", ""),
                "base_data": getattr(context, "base_data", {}) or {},
                "sku_source": getattr(context, "sku_source", ""),
                "created_sku_id": getattr(context, "created_sku_id", ""),
                "created_sku_code": getattr(context, "created_sku_code", ""),
                "inventory_prepare_status": getattr(context, "inventory_prepare_status", ""),
                "asn_id": getattr(context, "asn_id", ""),
                "asn_number": getattr(context, "asn_number", ""),
                "asn_line_id": getattr(context, "asn_line_id", ""),
                "receive_record_number": getattr(context, "receive_record_number", ""),
                "putaway_order_id": getattr(context, "putaway_order_id", ""),
                "putaway_location_code": getattr(context, "putaway_location_code", ""),
                "order_id": getattr(context, "order_id", ""),
                "order_number": getattr(context, "order_number", ""),
                "pick_order_id": getattr(context, "pick_order_id", ""),
                "pick_order_number": getattr(context, "pick_order_number", ""),
                "checkout_order_id": getattr(context, "checkout_order_id", ""),
                "checkout_number": getattr(context, "checkout_number", ""),
                "manifest_order_id": getattr(context, "manifest_order_id", ""),
                "manifest_number": getattr(context, "manifest_number", ""),
                "warnings": list(getattr(context, "warnings", []) or []),
            }
        }

    def tearDown(self) -> None:
        payload = self.build_report_json_data()
        if payload:
            print("[REPORT_JSON]")
            print(json.dumps(payload, ensure_ascii=False, indent=2))
