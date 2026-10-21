from datetime import datetime


def build_order_reference(prefix: str = "AITEST") -> str:
    return f"{prefix}{datetime.now():%Y%m%d%H%M%S}"


def sample_order_query_data() -> dict[str, str]:
    return {"reference_number": build_order_reference("ORD")}

