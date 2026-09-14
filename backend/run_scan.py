import sys
import os

from tracker import FlightTracker

def main():
    print("Inizializzazione FlightTracker per Marco...")
    tracker = FlightTracker()
    data = tracker.scan_all(force_refresh=True, max_weeks=42)
    print("Scansione completata!")
    print(f"Totale combinazioni trovate: {data['stats']['total_options_found']}")
    print(f"Prezzo piu basso trovato: {data['stats']['cheapest_price']} EUR")
    print(f"Offerte Oro (<45 EUR): {data['stats']['gold_deals_count']}")
    print(f"Offerte Argento (<75 EUR): {data['stats']['silver_deals_count']}")
    print("\nTop 5 offerte assolute per raggiungere Riky da Bergamo:")
    for i, t in enumerate(data['trips'][:5], 1):
        print(f"{i}. Andata: {t['origin_out']} -> {t['dest_out']} ({t['date_out']}) | Rientro: {t['origin_in']} -> {t['dest_in']} ({t['date_in']}) | {t['jaw_badge'].encode('ascii', 'ignore').decode()} | TOTALE: {t['total_price']} EUR")

if __name__ == "__main__":
    main()
