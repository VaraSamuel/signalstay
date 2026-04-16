from typing import Dict, Any


def summarize_property_update(parsed_data: Dict[str, Any]) -> str:
    parts = []

    if parsed_data.get("wifi_quality"):
        parts.append(f"Wi-Fi was reported as {parsed_data['wifi_quality'].replace('_', ' ')}")

    if parsed_data.get("parking_type"):
        parking_text = parsed_data["parking_type"].replace("_", " ")
        if parsed_data.get("parking_cost") is not None:
            parking_text += f" at about ${parsed_data['parking_cost']}"
        parts.append(f"parking was reported as {parking_text}")

    if parsed_data.get("pool_status"):
        parts.append(f"the pool was {parsed_data['pool_status']}")

    if parsed_data.get("noise_level"):
        parts.append(f"room noise was reported as {parsed_data['noise_level']}")

    if parsed_data.get("breakfast_status"):
        parts.append(f"breakfast was reported as {parsed_data['breakfast_status']}")

    if not parts:
        return "New traveler feedback was captured and stored."

    return "Recent guest feedback indicates that " + ", ".join(parts) + "."