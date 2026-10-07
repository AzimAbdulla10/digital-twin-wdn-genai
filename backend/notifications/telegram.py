import os
import logging
import requests
from typing import Optional, Dict, Any

import time

logger = logging.getLogger("hydrotwin.notifications.telegram")

# Global debounce tracker to prevent rapid duplicate messages
_LAST_DISPATCH_TIME = 0.0
_LAST_DISPATCH_KEY = ""

def send_telegram_alert(
    message: str,
    bot_token: Optional[str] = None,
    chat_id: Optional[str] = None,
    min_interval_seconds: float = 4.0
) -> Dict[str, Any]:
    """
    Sends an automated emergency notification via Telegram Bot API with duplicate debouncing.
    """
    global _LAST_DISPATCH_TIME, _LAST_DISPATCH_KEY
    now = time.time()
    
    # Debounce check: If identical or near-identical alert within min_interval_seconds, suppress duplicate
    msg_key = message[:50]
    if (now - _LAST_DISPATCH_TIME) < min_interval_seconds and msg_key == _LAST_DISPATCH_KEY:
        logger.info(f"[Telegram] Suppressed duplicate alert ({now - _LAST_DISPATCH_TIME:.2f}s since last).")
        return {
            "status": "debounced",
            "message": "Duplicate alert suppressed within debounce window."
        }
    
    token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
    target_chat = chat_id or os.getenv("TELEGRAM_CHAT_ID")

    if not token or not target_chat:
        logger.warning("[Telegram] Bot token or Chat ID not configured.")
        return {
            "status": "not_configured",
            "message": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing in backend/.env"
        }

    url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
    payload = {
        "chat_id": target_chat.strip(),
        "text": message,
        "parse_mode": "Markdown"
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        res_json = response.json()
        if response.status_code == 200 and res_json.get("ok"):
            _LAST_DISPATCH_TIME = time.time()
            _LAST_DISPATCH_KEY = msg_key
            logger.info(f"[Telegram] Alert delivered to chat_id {target_chat}.")
            return {
                "status": "success",
                "chat_id": target_chat,
                "message_id": res_json.get("result", {}).get("message_id")
            }
        else:
            logger.error(f"[Telegram] API error: {res_json}")
            return {
                "status": "error",
                "detail": res_json.get("description", "Unknown Telegram error")
            }
    except Exception as e:
        logger.error(f"[Telegram] Failed to dispatch message: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

def format_telegram_leak_alert(
    leak_node_id: str,
    leak_area: float = 0.005,
    pressure_drop: float = 26.4,
    confidence: float = 96.4,
    temperature: float = 28.0,
    ambient_time: str = "12:00"
) -> str:
    """
    Constructs an emergency engineering incident report for Telegram with Markdown.
    """
    return (
        f"🚨 *HYDROTWIN AI EMERGENCY ALERT*\n\n"
        f"• *Incident:* Physical Pipe Rupture Detected\n"
        f"• *Location:* Junction J{leak_node_id}\n"
        f"• *Orifice Area:* {leak_area:.4f} m²\n"
        f"• *Pressure Deficit:* -{pressure_drop:.1f} meters\n"
        f"• *ML Diagnostic:* Random Forest ({confidence:.1f}% confidence)\n"
        f"• *Environment:* {temperature:.1f}°C at {ambient_time} (Chennai WDN)\n\n"
        f"⚠️ *Priority Action:* Dispatch field crew to sector J{leak_node_id}. Close upstream isolation valve to prevent reservoir draw-down."
    )
