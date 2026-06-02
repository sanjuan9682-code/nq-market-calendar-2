#!/usr/bin/env python3
"""
Telegram Alert Sender for NQ Market Calendar
Envía un resumen diario de eventos de alto impacto a Telegram.
Se ejecuta automáticamente después de update_calendar.py vía GitHub Actions.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import requests

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT = os.environ.get("TELEGRAM_CHAT_ID", "")
DATA_PATH = Path(__file__).parent.parent / "data" / "calendar.json"


def send_message(text: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT:
        print("Telegram credentials not configured, skipping alert.", file=sys.stderr)
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        print("Telegram alert sent successfully.")
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}", file=sys.stderr)


def build_alert():
    if not DATA_PATH.exists():
        print(f"Calendar data not found at {DATA_PATH}", file=sys.stderr)
        return None

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    eventos = data.get("eventos", [])
    # Filtrar solo eventos de hoy con alto impacto
    today = datetime.now().strftime("%A")
    day_map = {
        "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
        "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Sunday": "Domingo"
    }
    today_es = day_map.get(today, today)

    today_events = [e for e in eventos if e.get("dia") == today_es]
    high_impact = [e for e in today_events if (e.get("impacto") or "").upper() == "ALTO"]
    medium_impact = [e for e in today_events if (e.get("impacto") or "").upper() == "MEDIO"]

    if not high_impact and not medium_impact:
        return None  # No enviar si no hay eventos relevantes

    lines = [
        f"<b>📅 NQ Calendar — {today_es}</b>",
        f"<i>{data.get('resumen_sesgo', '')}</i>",
        "",
    ]

    if high_impact:
        lines.append("<b>🔴 ALTO IMPACTO HOY:</b>")
        for ev in high_impact:
            hora = ev.get("hora_et", "")
            nombre = ev.get("nombre", "")
            esperado = ev.get("esperado", "—")
            lines.append(f"• {hora} ET → <b>{nombre}</b> (Est: {esperado})")
        lines.append("")

    if medium_impact:
        lines.append("<b>🟡 MEDIO IMPACTO:</b>")
        for ev in medium_impact[:3]:  # max 3
            hora = ev.get("hora_et", "")
            nombre = ev.get("nombre", "")
            lines.append(f"• {hora} ET → {nombre}")
        lines.append("")

    lines.append("<a href='https://sanjuan9682-code.github.io/nq-market-calendar/'>Abrir Calendario</a>")
    return "\n".join(lines)


def main():
    msg = build_alert()
    if msg:
        send_message(msg)
    else:
        print("No relevant events today. Skipping Telegram alert.")


if __name__ == "__main__":
    main()
