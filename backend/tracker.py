"""
Motore principale di ricerca, combinazione e tracciamento prezzi voli low-cost verso la Spagna.
Configurazione ottimizzata per Marco:
- Partenza e Rientro ESCLUSIVAMENTE da Bergamo Orio al Serio (BGY).
- Destinazioni ammesse: Alicante (ALC) e Valencia (VLC).
- Supporta tratte Classiche (BGY-ALC / BGY-VLC) e Open-Jaw su Spagna (es. BGY->ALC e VLC->BGY).
- Solo zainetto gratuito (zero costi extra).
"""

import json
import os
import time
import urllib.parse
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from ryanair import Ryanair
from holidays import get_holiday_tag, HOLIDAYS

CACHE_FILE = os.path.join(os.path.dirname(__file__), "flights_cache.json")
CACHE_DURATION_HOURS = 6

OUTBOUND_ROUTES = [
    ("BGY", "ALC"),
    ("BGY", "VLC")
]

INBOUND_ROUTES = [
    ("ALC", "BGY"),
    ("VLC", "BGY")
]

AIRPORT_NAMES = {
    "BGY": "Bergamo Orio",
    "ALC": "Alicante",
    "VLC": "Valencia"
}

AIRLINE_MAP = {
    "BGY-ALC": {"direct": ["Ryanair"], "monopoly": True, "notes": "Monopolio assoluto Ryanair da Bergamo Orio al Serio."},
    "BGY-VLC": {"direct": ["Ryanair"], "monopoly": True, "notes": "Monopolio assoluto Ryanair da Bergamo Orio al Serio."},
    "ALC-BGY": {"direct": ["Ryanair"], "monopoly": True, "notes": "Monopolio assoluto Ryanair da Alicante per Bergamo Orio."},
    "VLC-BGY": {"direct": ["Ryanair"], "monopoly": True, "notes": "Monopolio assoluto Ryanair da Valencia per Bergamo Orio."}
}

def generate_date_pairs(weeks_ahead: int = 42) -> List[Dict[str, Any]]:
    today = datetime.today().date()
    pairs = []

    curr = today + timedelta(days=2)
    # Copre fino al 30 Giugno 2027
    end_date = max(today + timedelta(days=weeks_ahead * 7), date(2027, 6, 30))

    while curr <= end_date:
        weekday = curr.weekday()

        # Weekend Standard: Venerdi -> Domenica
        if weekday == 4:
            sun = curr + timedelta(days=2)
            pairs.append({
                "type": "weekend_standard",
                "label": f"Weekend {curr.strftime('%d/%m')} - {sun.strftime('%d/%m')}",
                "date_out": curr.strftime("%Y-%m-%d"),
                "date_in": sun.strftime("%Y-%m-%d"),
                "nights": 2,
                "badge": "Weekend (Ven-Dom)"
            })

        # Weekend Lungo: Giovedi -> Lunedi
        if weekday == 3:
            mon = curr + timedelta(days=4)
            pairs.append({
                "type": "weekend_lungo",
                "label": f"Weekend Lungo {curr.strftime('%d/%m')} - {mon.strftime('%d/%m')}",
                "date_out": curr.strftime("%Y-%m-%d"),
                "date_in": mon.strftime("%Y-%m-%d"),
                "nights": 4,
                "badge": "Weekend Lungo (Giov-Lun)"
            })

        curr += timedelta(days=1)

    for h in HOLIDAYS:
        out_d, in_d = h["suggested_dates"]
        d_out_dt = datetime.strptime(out_d, "%Y-%m-%d").date()
        if today <= d_out_dt <= end_date:
            if not any(p["date_out"] == out_d and p["date_in"] == in_d for p in pairs):
                pairs.append({
                    "type": "ponte",
                    "label": f"{h['name']} ({h['description']})",
                    "date_out": out_d,
                    "date_in": in_d,
                    "nights": (datetime.strptime(in_d, "%Y-%m-%d").date() - d_out_dt).days,
                    "badge": h['name']
                })

    return pairs

def get_booking_url(origin: str, dest: str, date_out: str, date_in: Optional[str] = None, is_round_trip: bool = True) -> str:
    if is_round_trip and date_in:
        return f"https://www.ryanair.com/it/it/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut={date_out}&dateIn={date_in}&isConnectedFlight=false&isReturn=true&discount=0&originIata={origin}&destinationIata={dest}&tpAdults=1"
    else:
        return f"https://www.ryanair.com/it/it/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut={date_out}&isConnectedFlight=false&isReturn=false&discount=0&originIata={origin}&destinationIata={dest}&tpAdults=1"

def get_comparator_url(origin_out: str, dest_out: str, origin_in: str, dest_in: str, date_out: str, date_in: str) -> str:
    """Link diretto a Google Flights per verificare la combinazione."""
    q = f"flights from {origin_out} to {dest_out} on {date_out} and from {origin_in} to {dest_in} on {date_in}"
    return f"https://www.google.com/travel/flights?q={urllib.parse.quote(q)}"

class FlightTracker:
    def __init__(self):
        self.api = Ryanair("EUR")

    def fetch_single_leg(self, origin: str, dest: str, flight_date: str) -> Optional[Any]:
        try:
            res = self.api.get_cheapest_flights(origin, flight_date, flight_date, destination_airport=dest)
            return res[0] if res else None
        except Exception:
            return None

    def scan_all(self, force_refresh: bool = False, max_weeks: int = 42) -> Dict[str, Any]:
        if not force_refresh and os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    cache_data = json.load(f)
                    cache_time = cache_data.get("updated_at_timestamp", 0)
                    # Verifica che la cache contenga solo BGY
                    trips = cache_data.get("trips", [])
                    if trips and all(t.get("origin_out") == "BGY" for t in trips):
                        if (time.time() - cache_time) < (CACHE_DURATION_HOURS * 3600):
                            return cache_data
            except Exception:
                pass

        print("Avvio scansione Bergamo Orio (BGY) verso Spagna (ALC / VLC)...")
        date_pairs = generate_date_pairs(weeks_ahead=max_weeks)
        all_trips = []

        for pair in date_pairs:
            d_out = pair["date_out"]
            d_in = pair["date_in"]

            outbound_map = {}
            for orig, dest in OUTBOUND_ROUTES:
                f_out = self.fetch_single_leg(orig, dest, d_out)
                if f_out:
                    outbound_map[(orig, dest)] = f_out

            inbound_map = {}
            for orig, dest in INBOUND_ROUTES:
                f_in = self.fetch_single_leg(orig, dest, d_in)
                if f_in:
                    inbound_map[(orig, dest)] = f_in

            for (orig_out, dest_out), f_out in outbound_map.items():
                for (orig_in, dest_in), f_in in inbound_map.items():
                    price_out = round(float(f_out.price), 2)
                    price_in = round(float(f_in.price), 2)
                    total_price = round(price_out + price_in, 2)

                    spain_open = (dest_out != orig_in)

                    if not spain_open:
                        jaw_type = "classic"
                        jaw_badge = "A/R Stessa Città"
                        jaw_desc = f"Andata e Ritorno su {dest_out}"
                        is_pure_roundtrip = True
                        booking_url = get_booking_url(orig_out, dest_out, d_out, d_in, is_round_trip=True)
                    else:
                        jaw_type = "open_jaw_spain"
                        jaw_badge = "Incrocio Spagna"
                        jaw_desc = f"Arrivo ad {dest_out}, ripartenza da {orig_in} (sempre BGY)"
                        is_pure_roundtrip = False
                        booking_url = get_booking_url(orig_out, dest_out, d_out, is_round_trip=False)

                    booking_url_out = get_booking_url(orig_out, dest_out, d_out, is_round_trip=False)
                    booking_url_in = get_booking_url(orig_in, dest_in, d_in, is_round_trip=False)
                    comparator_url = get_comparator_url(orig_out, dest_out, orig_in, dest_in, d_out, d_in)

                    is_primary = (orig_out == "BGY" and dest_out == "ALC" and orig_in == "ALC" and dest_in == "BGY")

                    if total_price <= 45.0:
                        tier = "gold"
                        tier_label = "Tariffa d'Oro (< 45 €)"
                    elif total_price <= 75.0:
                        tier = "silver"
                        tier_label = "Ottimo Prezzo (< 75 €)"
                    elif total_price <= 120.0:
                        tier = "bronze"
                        tier_label = "Prezzo Medio"
                    else:
                        tier = "high"
                        tier_label = "Prezzo Alto"

                    holiday_info = get_holiday_tag(d_out, d_in)
                    route_key = f"{orig_out}-{dest_out}"
                    airline_info = AIRLINE_MAP.get(route_key, {"direct": ["Ryanair"], "monopoly": True, "notes": "Monopolio Ryanair da Bergamo"})

                    all_trips.append({
                        "id": f"{orig_out}{dest_out}-{orig_in}{dest_in}-{d_out}-{d_in}",
                        "origin_out": orig_out,
                        "origin_out_name": AIRPORT_NAMES.get(orig_out, orig_out),
                        "dest_out": dest_out,
                        "dest_out_name": AIRPORT_NAMES.get(dest_out, dest_out),
                        "origin_in": orig_in,
                        "origin_in_name": AIRPORT_NAMES.get(orig_in, orig_in),
                        "dest_in": dest_in,
                        "dest_in_name": AIRPORT_NAMES.get(dest_in, dest_in),
                        "airline": "Ryanair",
                        "operating_airlines": airline_info["direct"],
                        "is_monopoly": airline_info["monopoly"],
                        "airline_notes": airline_info["notes"],
                        "date_out": d_out,
                        "time_out": str(f_out.departureTime),
                        "price_out": price_out,
                        "flight_number_out": getattr(f_out, "flightNumber", "FR"),
                        "date_in": d_in,
                        "time_in": str(f_in.departureTime),
                        "price_in": price_in,
                        "flight_number_in": getattr(f_in, "flightNumber", "FR"),
                        "total_price": total_price,
                        "clean_ticket": True,
                        "baggage_included": "Solo zainetto gratuito (Zero extra)",
                        "tier": tier,
                        "tier_label": tier_label,
                        "pattern_type": pair["type"],
                        "pattern_label": pair["label"],
                        "pattern_badge": pair["badge"],
                        "nights": pair["nights"],
                        "jaw_type": jaw_type,
                        "jaw_badge": jaw_badge,
                        "jaw_desc": jaw_desc,
                        "is_primary_route": is_primary,
                        "holiday": holiday_info,
                        "is_pure_roundtrip": is_pure_roundtrip,
                        "booking_url": booking_url,
                        "booking_url_out": booking_url_out,
                        "booking_url_in": booking_url_in,
                        "comparator_url": comparator_url
                    })

        all_trips.sort(key=lambda x: x["total_price"])

        stats = {
            "total_options_found": len(all_trips),
            "cheapest_price": all_trips[0]["total_price"] if all_trips else 0,
            "gold_deals_count": sum(1 for t in all_trips if t["tier"] == "gold"),
            "silver_deals_count": sum(1 for t in all_trips if t["tier"] == "silver"),
            "open_jaw_deals_count": sum(1 for t in all_trips if t["jaw_type"] != "classic"),
            "primary_route_deals": sum(1 for t in all_trips if t["is_primary_route"] and t["total_price"] <= 75),
            "airport_focus": "Bergamo Orio al Serio (BGY)",
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at_timestamp": time.time()
        }

        output = {
            "stats": stats,
            "trips": all_trips,
            "airports": AIRPORT_NAMES,
            "airlines_info": AIRLINE_MAP,
            "holidays": HOLIDAYS
        }

        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print("Errore salvataggio cache:", e)

        return output

    def custom_search(self, origin_out: str, dest_out: str, origin_in: str, dest_in: str, date_out: str, date_in: str) -> Optional[Dict[str, Any]]:
        # Supporta sia Bergamo -> Spagna sia Spagna -> Bergamo (per Riky)
        origin_out = (origin_out or "BGY").upper().strip()
        dest_out = (dest_out or "ALC").upper().strip()
        origin_in = (origin_in or "ALC").upper().strip()
        dest_in = (dest_in or "BGY").upper().strip()

        f_out = self.fetch_single_leg(origin_out, dest_out, date_out)
        f_in = self.fetch_single_leg(origin_in, dest_in, date_in)

        if not f_out or not f_in:
            return None

        price_out = round(float(f_out.price), 2)
        price_in = round(float(f_in.price), 2)
        total_price = round(price_out + price_in, 2)

        is_from_bgy = (origin_out == "BGY")
        if is_from_bgy:
            spain_open = (dest_out != origin_in)
            if not spain_open:
                jaw_type = "classic"
                jaw_badge = "A/R Stessa Città"
                jaw_desc = f"Andata e Ritorno su {dest_out}"
                is_pure_roundtrip = True
                booking_url = get_booking_url(origin_out, dest_out, date_out, date_in, is_round_trip=True)
            else:
                jaw_type = "open_jaw_spain"
                jaw_badge = "Incrocio Spagna"
                jaw_desc = f"Arrivo ad {dest_out}, ripartenza da {origin_in}"
                is_pure_roundtrip = False
                booking_url = get_booking_url(origin_out, dest_out, date_out, is_round_trip=False)
        else:
            # Partenza dalla Spagna (es. ALC/VLC verso Bergamo e ritorno in Spagna)
            spain_open = (origin_out != dest_in)
            if not spain_open:
                jaw_type = "classic"
                jaw_badge = "A/R Spagna"
                jaw_desc = f"Partenza e Rientro su {origin_out}"
                is_pure_roundtrip = True
                booking_url = get_booking_url(origin_out, dest_out, date_out, date_in, is_round_trip=True)
            else:
                jaw_type = "open_jaw_spain"
                jaw_badge = "Incrocio Spagna"
                jaw_desc = f"Partenza da {origin_out}, rientro a {dest_in}"
                is_pure_roundtrip = False
                booking_url = get_booking_url(origin_out, dest_out, date_out, is_round_trip=False)

        booking_url_out = get_booking_url(origin_out, dest_out, date_out, is_round_trip=False)
        booking_url_in = get_booking_url(origin_in, dest_in, date_in, is_round_trip=False)
        comparator_url = get_comparator_url(origin_out, dest_out, origin_in, dest_in, date_out, date_in)

        d_out_dt = datetime.strptime(date_out, "%Y-%m-%d").date()
        d_in_dt = datetime.strptime(date_in, "%Y-%m-%d").date()
        nights = (d_in_dt - d_out_dt).days

        route_key = f"{origin_out}-{dest_out}"
        airline_info = AIRLINE_MAP.get(route_key, {"direct": ["Ryanair"], "monopoly": True, "notes": "Volo diretto Ryanair"})

        return {
            "direction": "BGY_TO_ES" if is_from_bgy else "ES_TO_BGY",
            "origin_out": origin_out,
            "origin_out_name": AIRPORT_NAMES.get(origin_out, origin_out),
            "dest_out": dest_out,
            "dest_out_name": AIRPORT_NAMES.get(dest_out, dest_out),
            "origin_in": origin_in,
            "origin_in_name": AIRPORT_NAMES.get(origin_in, origin_in),
            "dest_in": dest_in,
            "dest_in_name": AIRPORT_NAMES.get(dest_in, dest_in),
            "date_out": date_out,
            "time_out": str(f_out.departureTime),
            "price_out": price_out,
            "flight_number_out": getattr(f_out, "flightNumber", "FR"),
            "date_in": date_in,
            "time_in": str(f_in.departureTime),
            "price_in": price_in,
            "flight_number_in": getattr(f_in, "flightNumber", "FR"),
            "total_price": total_price,
            "nights": nights,
            "jaw_type": jaw_type,
            "jaw_badge": jaw_badge,
            "jaw_desc": jaw_desc,
            "is_pure_roundtrip": is_pure_roundtrip,
            "operating_airlines": airline_info.get("direct", ["Ryanair"]),
            "pattern_badge": f"Soggiorno {nights} notti",
            "booking_url": booking_url,
            "booking_url_out": booking_url_out,
            "booking_url_in": booking_url_in,
            "comparator_url": comparator_url
        }
