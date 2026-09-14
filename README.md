# Voli Riky Spagna — Flight Tracker (Bergamo BGY)

Piattaforma su misura per monitorare e calcolare le migliori tariffe aeree da **Bergamo Orio al Serio (BGY)** verso **Alicante (ALC)** e **Valencia (VLC)** per raggiungere Riky in Spagna.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## Caratteristiche Principali

- **Esclusivo Bergamo Orio al Serio (BGY)**: Nessun volo da Malpensa o Linate, logistica ottimizzata al 100%.
- **Monopolio Ryanair & Tratte Dirette**: Monitoraggio continuo tariffe con API ufficiali.
- **Combinazioni Classiche & Open-Jaw**: Voli A/R sulla stessa città o incrociati (arrivo ad Alicante e rientro da Valencia).
- **Regola Aurea Solo Zainetto Gratuito**: Tariffe reali e finite a/r senza costi aggiuntivi di bagaglio.
- **Visualizzazione Giorno della Settimana**: Indicazione chiara per ogni combinazione (es. *Giovedì 29 Ott → Lunedì 2 Nov*).
- **Calcolatore Date Libere**: Calendario grafico interattivo a 7 colonne con selezione rapida di weekend e ponti festivi.
- **Design Editoriale "Luce del Mediterraneo"**: Estetica ortogonale a 90° netti (`border-radius: 0px`), palette sabbia/avorio e terracotta iberica, font `Inter` a cifre tabulari, zero emoji o cliché da AI.

---

## Architettura

- **Backend**: FastAPI (Python 3.11) + Uvicorn + `ryanair-py`
- **Frontend**: Vanilla HTML5, CSS3 moderno, JavaScript ES6 (nessun framework pesante, 60 fps istantanei).

---

## Esecuzione Locale

```bash
# Installa dipendenze
pip install -r requirements.txt

# Avvia il server
cd backend
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Apri il browser su `http://localhost:8000/`.
