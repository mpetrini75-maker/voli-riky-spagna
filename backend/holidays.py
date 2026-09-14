"""
Modulo per la gestione dei ponti festivi e del calendario ferie per i voli Milano/Bergamo -> Alicante/Valencia.
"""

from datetime import datetime, date

# Festività italiane ed europee principali 2026 - 2027
HOLIDAYS = [
    {
        "name": "Tutti i Santi",
        "date": "2026-11-01",
        "type": "Festività",
        "suggested_dates": ("2026-10-30", "2026-11-02"),
        "vacation_days": 1,
        "description": "Weekend lungo Ognissanti (Ven - Lun)"
    },
    {
        "name": "Ponte dell'Immacolata",
        "date": "2026-12-08",
        "type": "Super Ponte",
        "suggested_dates": ("2026-12-04", "2026-12-08"),
        "vacation_days": 1,
        "description": "Martedì festivo: basta il lunedì 7 per 5 giorni consecutivi!"
    },
    {
        "name": "Ponte di Natale e S. Stefano",
        "date": "2026-12-25",
        "type": "Ponte Festivo",
        "suggested_dates": ("2026-12-24", "2026-12-28"),
        "vacation_days": 1,
        "description": "Natale cade di Venerdì: weekend lungo naturale!"
    },
    {
        "name": "Capodanno 2027",
        "date": "2027-01-01",
        "type": "Ponte Festivo",
        "suggested_dates": ("2026-12-31", "2027-01-04"),
        "vacation_days": 1,
        "description": "Capodanno cade di Venerdì: 4 giorni da Riky con 1 giorno di ferie!"
    },
    {
        "name": "Epifania 2027",
        "date": "2027-01-06",
        "type": "Infrasettimanale",
        "suggested_dates": ("2027-01-05", "2027-01-07"),
        "vacation_days": 1,
        "description": "Mercoledì 6 Gennaio"
    },
    {
        "name": "Pasqua e Pasquetta 2027",
        "date": "2027-03-29",
        "type": "Super Ponte",
        "suggested_dates": ("2027-03-26", "2027-03-30"),
        "vacation_days": 1,
        "description": "Weekend pasquale: Lunedì dell'Angelo festivo (0 ferie per 4 giorni!)"
    },
    {
        "name": "Ponte 25 Aprile 2027",
        "date": "2027-04-25",
        "type": "Festività",
        "suggested_dates": ("2027-04-23", "2027-04-26"),
        "vacation_days": 1,
        "description": "Weekend di Primavera da Riky"
    },
    {
        "name": "Ponte del 1° Maggio 2027",
        "date": "2027-05-01",
        "type": "Festività",
        "suggested_dates": ("2027-04-30", "2027-05-03"),
        "vacation_days": 1,
        "description": "1° Maggio (Sabato) con rientro lunedì sera"
    },
    {
        "name": "Festa della Repubblica 2027",
        "date": "2027-06-02",
        "type": "Ponte Estivo",
        "suggested_dates": ("2027-05-29", "2027-06-02"),
        "vacation_days": 1,
        "description": "Mercoledì 2 Giugno: ideale per un anticipo d'estate in Spagna"
    }
]

def get_holiday_tag(outbound_date_str: str, inbound_date_str: str) -> dict | None:
    """Riconosce se un intervallo andata/ritorno coincide con un ponte o festività."""
    try:
        d_out = datetime.strptime(outbound_date_str[:10], "%Y-%m-%d").date()
        d_in = datetime.strptime(inbound_date_str[:10], "%Y-%m-%d").date()
    except Exception:
        return None

    for h in HOLIDAYS:
        h_date = datetime.strptime(h["date"], "%Y-%m-%d").date()
        # Se la data festiva cade durante il soggiorno
        if d_out <= h_date <= d_in:
            return {
                "name": h["name"],
                "type": h["type"],
                "description": h["description"],
                "vacation_days": h["vacation_days"]
            }
    return None
