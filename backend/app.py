import os
from typing import Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from tracker import FlightTracker, AIRPORT_NAMES
from holidays import HOLIDAYS

app = FastAPI(title="Flight Tracker Spagna — Raggiungi Riky (Bergamo)", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tracker = FlightTracker()

class CustomSearchRequest(BaseModel):
    origin_out: str = "BGY"
    dest_out: str
    origin_in: str
    dest_in: str = "BGY"
    date_out: str
    date_in: str

@app.get("/api/flights")
def get_flights(
    pattern: Optional[str] = Query(None, description="Filtro pattern: weekend_standard, weekend_lungo, ponte, all"),
    jaw: Optional[str] = Query(None, description="Filtro Open-Jaw: classic, open_jaw, spain, all"),
    route: Optional[str] = Query(None, description="Filtro rotta andata: BGY-ALC, BGY-VLC, all"),
    max_price: Optional[float] = Query(None, description="Prezzo massimo A/R"),
    month: Optional[str] = Query(None, description="Mese YYYY-MM"),
    sort_by: Optional[str] = Query("price", description="Ordinamento: price, date")
):
    """Restituisce le offerte comprensive di combinazioni aperte Open-Jaw solo per Bergamo."""
    data = tracker.scan_all(force_refresh=False)
    trips = data.get("trips", [])

    # Filtro per pattern (weekend standard, lungo, ponte)
    if pattern and pattern != "all":
        trips = [t for t in trips if t.get("pattern_type") == pattern]

    # Filtro Open-Jaw Spagna
    if jaw and jaw != "all":
        if jaw == "classic":
            trips = [t for t in trips if t.get("jaw_type") == "classic"]
        elif jaw in ["open_jaw", "spain", "open_jaw_spain"]:
            trips = [t for t in trips if t.get("jaw_type") == "open_jaw_spain"]

    # Filtro per rotta di andata (BGY-ALC o BGY-VLC)
    if route and route != "all":
        trips = [t for t in trips if f"{t['origin_out']}-{t['dest_out']}" == route]

    # Filtro per prezzo massimo
    if max_price is not None:
        trips = [t for t in trips if t.get("total_price", 999) <= max_price]

    # Filtro per mese
    if month and month != "all":
        trips = [t for t in trips if t.get("date_out", "").startswith(month)]

    # Ordinamento
    if sort_by == "date":
        trips.sort(key=lambda x: x["date_out"])
    else:
        trips.sort(key=lambda x: x["total_price"])

    return {
        "stats": data.get("stats", {}),
        "total_filtered": len(trips),
        "trips": trips,
        "airports": AIRPORT_NAMES,
        "holidays": HOLIDAYS
    }

@app.get("/api/refresh")
def force_refresh():
    """Forza la riscansione immediata con i dati live da Ryanair API."""
    data = tracker.scan_all(force_refresh=True)
    return {
        "status": "success",
        "message": "Prezzi aggiornati con successo per Bergamo!",
        "stats": data.get("stats", {})
    }

@app.post("/api/custom-search")
def custom_search(req: CustomSearchRequest):
    """Ricerca personalizzata per date specifiche con partenza e rientro da Bergamo."""
    res = tracker.custom_search("BGY", req.dest_out, req.origin_in, "BGY", req.date_out, req.date_in)
    if not res:
        return {"found": False, "message": "Nessun volo Ryanair trovato per le date selezionate."}
    return {"found": True, "trip": res}

# Serve il frontend statico
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
