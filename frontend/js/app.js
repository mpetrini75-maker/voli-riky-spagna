// Stato globale dell'applicazione
let allTrips = [];
let allHolidays = [];
let currentPattern = 'all';
let currentJaw = 'all';
let maxBudget = 120;

// Costanti giorni della settimana e mesi in italiano
const DAYS_OF_WEEK_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const DAYS_OF_WEEK_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_FULL_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const MONTHS_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// Stato del Calendario Grafico Interattivo
let calYear = 2026;
let calMonth = 9; // 0-indexed: 9 = Ottobre 2026
let calDateOut = '2026-10-29';
let calDateIn = '2026-11-02';

// Formattatori data con giorno della settimana esplicito
function getItalianDateWithDay(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayName = DAYS_OF_WEEK_IT[d.getDay()];
  const monthName = MONTHS_SHORT[month - 1];
  return `${dayName} ${day} ${monthName} ${year}`;
}

function getShortDateWithDay(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayShort = DAYS_OF_WEEK_SHORT[d.getDay()];
  const monthName = MONTHS_SHORT[month - 1];
  return `${dayShort} ${day} ${monthName}`;
}

// Inizializzazione al caricamento
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initCalendar();
  loadData();
});

function setupEventListeners() {
  // Pillole filtro pattern
  const patternPills = document.querySelectorAll('#pattern-pills .pill');
  patternPills.forEach(pill => {
    pill.addEventListener('click', () => {
      patternPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentPattern = pill.dataset.pattern;
      applyFilters();
    });
  });

  // Pillole filtro Destinazione Spagna (Classico vs Incrocio)
  const jawPills = document.querySelectorAll('#jaw-pills .pill');
  jawPills.forEach(pill => {
    pill.addEventListener('click', () => {
      jawPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentJaw = pill.dataset.jaw;
      applyFilters();
    });
  });
}

// Inizializzazione Calendario Grafico
function initCalendar() {
  const dOutInput = document.getElementById('custom-date-out');
  const dInInput = document.getElementById('custom-date-in');
  
  if (dOutInput && dOutInput.value) {
    calDateOut = dOutInput.value;
    const parts = calDateOut.split('-').map(Number);
    calYear = parts[0];
    calMonth = parts[1] - 1;
  }
  if (dInInput && dInInput.value) {
    calDateIn = dInInput.value;
  }

  // Ascolta modifiche manuali sugli input di testo
  if (dOutInput) {
    dOutInput.addEventListener('change', (e) => {
      calDateOut = e.target.value;
      if (calDateOut) {
        const parts = calDateOut.split('-').map(Number);
        calYear = parts[0];
        calMonth = parts[1] - 1;
      }
      updateCalendarSummary();
      renderCalendar();
    });
  }

  if (dInInput) {
    dInInput.addEventListener('change', (e) => {
      calDateIn = e.target.value;
      updateCalendarSummary();
      renderCalendar();
    });
  }

  updateCalendarSummary();
  renderCalendar();
}

// Aggiorna il riepilogo testuale e sincronizza gli input
function updateCalendarSummary() {
  const summaryOut = document.getElementById('cal-summary-out');
  const summaryIn = document.getElementById('cal-summary-in');
  const summaryNights = document.getElementById('cal-summary-nights');

  if (summaryOut) {
    summaryOut.textContent = calDateOut ? getItalianDateWithDay(calDateOut) : 'Seleziona data';
  }
  if (summaryIn) {
    summaryIn.textContent = calDateIn ? getItalianDateWithDay(calDateIn) : 'Seleziona data';
  }

  if (summaryNights) {
    if (calDateOut && calDateIn && calDateIn > calDateOut) {
      const d1 = new Date(calDateOut);
      const d2 = new Date(calDateIn);
      const nights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      summaryNights.textContent = `${nights} ${nights === 1 ? 'notte' : 'notti'}`;
    } else {
      summaryNights.textContent = '0 notti';
    }
  }

  // Sincronizza anche con gli input di testo e gli hint
  const dOutInput = document.getElementById('custom-date-out');
  const dInInput = document.getElementById('custom-date-in');
  if (dOutInput && calDateOut) dOutInput.value = calDateOut;
  if (dInInput && calDateIn) dInInput.value = calDateIn;

  const hintOut = document.getElementById('custom-date-out-hint');
  const hintIn = document.getElementById('custom-date-in-hint');
  if (hintOut) {
    hintOut.innerHTML = calDateOut ? `Andata: <strong>${getItalianDateWithDay(calDateOut)}</strong>` : 'Andata: Seleziona data';
  }
  if (hintIn) {
    hintIn.innerHTML = calDateIn ? `Rientro: <strong>${getItalianDateWithDay(calDateIn)}</strong>` : 'Rientro: Seleziona data';
  }
}

// Navigazione mese calendario
function changeCalendarMonth(delta) {
  calMonth += delta;
  if (calMonth > 11) {
    calMonth = 0;
    calYear += 1;
  } else if (calMonth < 0) {
    calMonth = 11;
    calYear -= 1;
  }
  renderCalendar();
}

// Selezioni rapide presets calendario
function selectCalPreset(preset) {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'next_weekend') {
    let d = new Date(today);
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1); // prossimo venerdì
    let sun = new Date(d);
    sun.setDate(sun.getDate() + 2); // domenica
    calDateOut = fmt(d);
    calDateIn = fmt(sun);
  } else if (preset === 'long_weekend') {
    let d = new Date(today);
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1); // prossimo giovedì
    let mon = new Date(d);
    mon.setDate(mon.getDate() + 4); // lunedì
    calDateOut = fmt(d);
    calDateIn = fmt(mon);
  } else if (preset === 'ognissanti') {
    calDateOut = '2026-10-29';
    calDateIn = '2026-11-02';
  } else if (preset === 'immacolata') {
    calDateOut = '2026-12-04';
    calDateIn = '2026-12-08';
  } else if (preset === 'natale') {
    calDateOut = '2026-12-24';
    calDateIn = '2026-12-28';
  }

  if (calDateOut) {
    const parts = calDateOut.split('-').map(Number);
    calYear = parts[0];
    calMonth = parts[1] - 1;
  }

  updateCalendarSummary();
  renderCalendar();
}

// Click su un giorno del calendario
function handleCalDayClick(dateStr) {
  if (!calDateOut || (calDateOut && calDateIn)) {
    // Primo click o reset: imposta l'andata
    calDateOut = dateStr;
    calDateIn = null;
  } else if (calDateOut && !calDateIn) {
    // Secondo click: se successivo all'andata, imposta il ritorno
    if (dateStr > calDateOut) {
      calDateIn = dateStr;
    } else if (dateStr < calDateOut) {
      // Se clicca una data precedente, sposta l'andata
      calDateOut = dateStr;
    } else {
      calDateIn = null;
    }
  }

  updateCalendarSummary();
  renderCalendar();
}

// Render visivo della griglia del calendario
function renderCalendar() {
  const titleEl = document.getElementById('calendar-month-title');
  const gridEl = document.getElementById('calendar-grid');
  if (!gridEl) return;

  if (titleEl) {
    titleEl.textContent = `${MONTHS_FULL_IT[calMonth]} ${calYear}`;
  }

  // Intestazione giorni Lun-Dom
  const dayNames = [
    { label: 'Lun', weekend: false },
    { label: 'Mar', weekend: false },
    { label: 'Mer', weekend: false },
    { label: 'Gio', weekend: false },
    { label: 'Ven', weekend: true },
    { label: 'Sab', weekend: true },
    { label: 'Dom', weekend: true }
  ];

  let html = dayNames.map(d => `
    <div class="cal-day-header ${d.weekend ? 'weekend' : ''}">${d.label}</div>
  `).join('');

  // Primo giorno del mese (0 = Lun, ..., 6 = Dom)
  const firstDay = new Date(calYear, calMonth, 1);
  const dayOfWeek = (firstDay.getDay() + 6) % 7; // Lunedì = 0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Spazi vuoti prima del giorno 1
  for (let i = 0; i < dayOfWeek; i++) {
    html += `<div class="cal-cell empty"></div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const pad = n => String(n).padStart(2, '0');

  // Genera le celle del mese
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(d)}`;
    const currDate = new Date(calYear, calMonth, d);
    const dayOfWeekIdx = (currDate.getDay() + 6) % 7; // 4 = Ven, 5 = Sab, 6 = Dom
    const isWeekend = dayOfWeekIdx >= 4;

    const isPast = dateStr < todayStr;
    const isSelectedOut = (dateStr === calDateOut);
    const isSelectedIn = (dateStr === calDateIn);
    const isInRange = (calDateOut && calDateIn && dateStr > calDateOut && dateStr < calDateIn);

    let classes = ['cal-cell'];
    if (isWeekend) classes.push('weekend');
    if (isPast) classes.push('disabled');
    if (isSelectedOut) classes.push('selected-out');
    if (isSelectedIn) classes.push('selected-in');
    if (isInRange) classes.push('in-range');

    let badge = '';
    if (isSelectedOut) badge = '<span class="cal-cell-badge">Andata</span>';
    else if (isSelectedIn) badge = '<span class="cal-cell-badge">Rientro</span>';

    const clickAction = isPast ? '' : `onclick="handleCalDayClick('${dateStr}')"`;

    html += `
      <div class="${classes.join(' ')}" ${clickAction} title="${getItalianDateWithDay(dateStr)}">
        <span>${d}</span>
        ${badge}
      </div>
    `;
  }

  gridEl.innerHTML = html;
}

// Caricamento dati iniziali dal server
async function loadData() {
  try {
    const res = await fetch('/api/flights');
    if (!res.ok) throw new Error('Errore nel recupero dei voli');
    const data = await res.json();

    allTrips = data.trips || [];
    allHolidays = data.holidays || [];

    updateKPIs(data.stats);
    renderHolidays(allHolidays);
    applyFilters();
  } catch (err) {
    console.error('Errore API:', err);
    document.getElementById('flights-container').innerHTML = `
      <div class="glass-box" style="grid-column: 1/-1; padding: 2rem; text-align: center;">
        <p style="color: #ef4444; font-weight: 600;">Impossibile caricare i dati dei voli.</p>
        <p style="color: #9ca3af; margin-top: 0.5rem;">Verifica che il server backend sia attivo su porta 8000.</p>
      </div>
    `;
  }
}

// Aggiornamento KPI in testata
function updateKPIs(stats) {
  if (!stats) return;
  const kpiCheapest = document.getElementById('kpi-cheapest');
  const kpiGold = document.getElementById('kpi-gold-count');

  if (kpiCheapest) kpiCheapest.textContent = `${stats.cheapest_price} €`;
  if (kpiGold) kpiGold.textContent = stats.gold_deals_count || '0';
}

// Slider budget
function updateBudget(val) {
  maxBudget = parseFloat(val);
  const display = document.getElementById('budget-display');
  if (display) display.textContent = `${val} €`;
  applyFilters();
}

// Filtraggio locale reattivo
function applyFilters() {
  const routeVal = document.getElementById('route-select').value;
  const monthVal = document.getElementById('month-select').value;
  const sortVal = document.getElementById('sort-select').value;

  let filtered = allTrips.filter(trip => {
    // Filtro Pattern
    if (currentPattern !== 'all' && trip.pattern_type !== currentPattern) {
      return false;
    }

    // Filtro Destinazione Spagna (Classico vs Incrocio Spagna)
    if (currentJaw !== 'all') {
      if (currentJaw === 'classic' && trip.jaw_type !== 'classic') return false;
      if (currentJaw === 'spain' && trip.jaw_type !== 'open_jaw_spain') return false;
    }

    // Filtro Rotta Andata (BGY-ALC o BGY-VLC)
    if (routeVal !== 'all' && `${trip.origin_out}-${trip.dest_out}` !== routeVal) {
      return false;
    }

    // Filtro Mese
    if (monthVal !== 'all' && !trip.date_out.startsWith(monthVal)) {
      return false;
    }

    // Filtro Budget
    if (trip.total_price > maxBudget) {
      return false;
    }
    return true;
  });

  // Ordinamento
  if (sortVal === 'date') {
    filtered.sort((a, b) => a.date_out.localeCompare(b.date_out));
  } else {
    filtered.sort((a, b) => a.total_price - b.total_price);
  }

  // Aggiorna contatori
  const tabCount = document.getElementById('tab-count-deals');
  if (tabCount) tabCount.textContent = filtered.length;

  const visCount = document.getElementById('visible-count');
  if (visCount) visCount.textContent = filtered.length;

  renderFlights(filtered);
}

// Render lista card voli con giorno della settimana ben visibile
function renderFlights(trips) {
  const container = document.getElementById('flights-container');
  if (!container) return;

  if (trips.length === 0) {
    container.innerHTML = `
      <div class="glass-box" style="grid-column: 1/-1; padding: 3rem; text-align: center;">
        <p style="font-size: 1.2rem; color: #f3f4f6; margin-bottom: 0.5rem;">Nessuna combinazione trovata da Bergamo con i filtri attuali.</p>
        <p style="color: #9ca3af;">Prova ad alzare il budget massimo o a selezionare "Tutti i giorni".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = trips.map(t => {
    const isGold = t.tier === 'gold';
    const isSilver = t.tier === 'silver';
    const tierClass = isGold ? 'tier-gold' : (isSilver ? 'tier-silver' : '');
    
    // Date con giorno della settimana esplicito
    const outDateFull = getItalianDateWithDay(t.date_out);
    const inDateFull = getItalianDateWithDay(t.date_in);
    const outShort = getShortDateWithDay(t.date_out);
    const inShort = getShortDateWithDay(t.date_in);

    const outTimeOnly = t.time_out.includes(' ') ? t.time_out.split(' ')[1].substring(0, 5) : t.time_out;
    const inTimeOnly = t.time_in.includes(' ') ? t.time_in.split(' ')[1].substring(0, 5) : t.time_in;

    const holidayBadge = t.holiday ? `
      <span class="tag tag-holiday" title="${t.holiday.description}">
        ${t.holiday.name}
      </span>
    ` : '';

    const jawBadge = t.jaw_badge ? `
      <span class="tag tag-jaw" title="${t.jaw_desc}">
        ${t.jaw_badge}
      </span>
    ` : '';

    const primaryStar = '';

    // Comparatore con Google Flights
    const comparatorBtn = t.comparator_url ? `
      <a href="${t.comparator_url}" target="_blank" rel="noopener noreferrer" class="secondary-button" title="Verifica orari alternativi su Google Flights">
        Verifica Orari su Google Flights →
      </a>
    ` : '';

    // Azioni di prenotazione: bottoni chiari con data e giorno
    const isPureRoundtrip = (t.dest_out === t.origin_in);
    let actionButtonsHtml = '';

    if (isPureRoundtrip) {
      actionButtonsHtml = `
        <div class="card-actions">
          <a href="${t.booking_url}" target="_blank" rel="noopener noreferrer" class="cta-button">
            Prenota A/R Ryanair (${outShort} → ${inShort}) • ${t.total_price} € →
          </a>
          ${comparatorBtn}
        </div>
      `;
    } else {
      actionButtonsHtml = `
        <div class="card-actions" style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; gap: 0.5rem;">
            <a href="${t.booking_url_out || t.booking_url}" target="_blank" rel="noopener noreferrer" class="cta-button" style="flex: 1; padding: 0.65rem 0.5rem; font-size: 0.85rem; text-align: center;">
              1. Andata: ${outShort} (${t.price_out} €) →
            </a>
            <a href="${t.booking_url_in || t.booking_url}" target="_blank" rel="noopener noreferrer" class="cta-button" style="flex: 1; padding: 0.65rem 0.5rem; font-size: 0.85rem; text-align: center; background: linear-gradient(135deg, #059669, #10b981);">
              2. Rientro: ${inShort} (${t.price_in} €) →
            </a>
          </div>
          ${comparatorBtn}
        </div>
      `;
    }

    return `
      <article class="flight-card ${tierClass}">
        <div class="card-header">
          <div class="route-info">
            <h3>${primaryStar}Bergamo → ${t.dest_out_name} • Rientro da ${t.origin_in_name}</h3>
            <div style="margin-top: 0.35rem; font-size: 1rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 0.4rem;">
              <span>${outShort} → ${inShort}</span>
              <span style="font-size: 0.8rem; background: rgba(56, 189, 248, 0.15); color: #bae6fd; padding: 0.15rem 0.5rem; border-radius: 6px;">${t.nights} notti</span>
            </div>
          </div>
          <div class="price-box">
            <div class="total-price">${t.total_price} €</div>
            <div class="price-note">A/R Finito (Zaino)</div>
          </div>
        </div>

        <div class="legs-container">
          <!-- Andata -->
          <div class="leg">
            <div class="leg-icon">→</div>
            <div class="leg-details">
              <div class="leg-date" style="font-size: 0.95rem;">
                Andata: <strong style="color: #60a5fa; font-weight: 700;">${outDateFull}</strong>
              </div>
              <div class="leg-time" style="margin-top: 0.2rem;">
                Decollo ore <strong>${outTimeOnly}</strong> da Bergamo Orio (BGY) → arrivo a ${t.dest_out_name} • Ryanair (${t.flight_number_out})
              </div>
            </div>
            <div class="leg-price">${t.price_out} €</div>
          </div>

          <!-- Ritorno -->
          <div class="leg">
            <div class="leg-icon">←</div>
            <div class="leg-details">
              <div class="leg-date" style="font-size: 0.95rem;">
                Rientro: <strong style="color: #34d399; font-weight: 700;">${inDateFull}</strong>
              </div>
              <div class="leg-time" style="margin-top: 0.2rem;">
                Decollo ore <strong>${inTimeOnly}</strong> da ${t.origin_in_name} (${t.origin_in}) → arrivo a Bergamo Orio • Ryanair (${t.flight_number_in})
              </div>
            </div>
            <div class="leg-price">${t.price_in} €</div>
          </div>
        </div>

        <div class="card-tags">
          <span class="tag tag-pattern">${t.pattern_badge}</span>
          ${jawBadge}
          <span class="tag tag-clean">Solo Zainetto Gratuito</span>
          ${holidayBadge}
        </div>

        ${actionButtonsHtml}
      </article>
    `;
  }).join('');
}

// Render sezione Festività e Ponti con giorni della settimana
function renderHolidays(holidays) {
  const container = document.getElementById('holidays-container');
  if (!container) return;

  container.innerHTML = holidays.map(h => {
    const dOut = h.suggested_dates[0];
    const dIn = h.suggested_dates[1];
    
    const outShort = getShortDateWithDay(dOut);
    const inShort = getShortDateWithDay(dIn);

    // Cerca miglior prezzo da Bergamo per questo ponte
    const matchingTrips = allTrips.filter(t => t.date_out === dOut && t.date_in === dIn);
    matchingTrips.sort((a, b) => a.total_price - b.total_price);
    const bestTrip = matchingTrips[0];

    const priceHtml = bestTrip ? `
      <div class="holiday-price">
        <span class="h-price-label">Miglior Volo da Bergamo:</span>
        <span class="h-price-val">${bestTrip.total_price} €</span>
      </div>
      <div style="font-size: 0.85rem; color: #9ca3af; margin-top: 0.25rem;">
        Tratta: ${bestTrip.origin_out}→${bestTrip.dest_out} e ${bestTrip.origin_in}→${bestTrip.dest_in}
      </div>
      <a href="${bestTrip.booking_url}" target="_blank" rel="noopener noreferrer" class="cta-button" style="margin-top: 1rem; padding: 0.6rem 1rem; font-size: 0.85rem;">
        Vedi Offerta Ponte (${outShort} → ${inShort}) →
      </a>
    ` : `
      <div class="holiday-price">
        <span class="h-price-label">Prezzo stimato A/R:</span>
        <span class="h-price-val" style="color: #9ca3af;">Da verificare</span>
      </div>
      <button onclick="searchHolidaySpecific('${dOut}', '${dIn}')" class="secondary-button" style="margin-top: 1rem; font-size: 0.85rem;">
        Cerca Voli (${outShort} → ${inShort})
      </button>
    `;

    return `
      <div class="holiday-card">
        <div class="holiday-date-badge">${outShort} → ${inShort}</div>
        <div class="holiday-name">${h.name}</div>
        <div class="holiday-desc">${h.description}</div>
        <div class="holiday-days">
          ${h.days_off_needed === 0 ? 'Zero ferie necessarie!' : `Solo ${h.days_off_needed} giorno di ferie`}
        </div>
        ${priceHtml}
      </div>
    `;
  }).join('');
}

// Cerca ponte specifico nel form personalizzato e aggiorna il calendario
function searchHolidaySpecific(dOut, dIn) {
  switchTab('custom');
  calDateOut = dOut;
  calDateIn = dIn;
  const parts = calDateOut.split('-').map(Number);
  calYear = parts[0];
  calMonth = parts[1] - 1;
  updateCalendarSummary();
  renderCalendar();
  document.getElementById('btn-search-custom').click();
}

// Ricerca personalizzata con giorno della settimana esplicito nel risultato
async function executeCustomSearch(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-search-custom');
  const resultBox = document.getElementById('custom-result');

  const destOut = document.getElementById('custom-dest-out').value;
  const origIn = document.getElementById('custom-orig-in').value;
  const dateOut = document.getElementById('custom-date-out').value;
  const dateIn = document.getElementById('custom-date-in').value;

  if (new Date(dateIn) <= new Date(dateOut)) {
    alert('La data di rientro deve essere successiva alla data di andata!');
    return;
  }

  btn.textContent = '⏳ Ricerca voli Ryanair in corso...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/custom-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_out: 'BGY',
        dest_out: destOut,
        origin_in: origIn,
        dest_in: 'BGY',
        date_out: dateOut,
        date_in: dateIn
      })
    });

    const data = await res.json();
    resultBox.style.display = 'block';

    if (!data.found || !data.trip) {
      resultBox.innerHTML = `
        <p style="color: #ef4444; font-weight: 600;">Nessun volo Ryanair trovato da Bergamo per le date selezionate.</p>
        <p style="color: #9ca3af; margin-top: 0.3rem;">Prova a variare la data di un giorno.</p>
      `;
    } else {
      const t = data.trip;
      const outDateFull = getItalianDateWithDay(t.date_out);
      const inDateFull = getItalianDateWithDay(t.date_in);
      const outShort = getShortDateWithDay(t.date_out);
      const inShort = getShortDateWithDay(t.date_in);

      const comparatorBtn = t.comparator_url ? `
        <a href="${t.comparator_url}" target="_blank" rel="noopener noreferrer" class="secondary-button" style="margin-top: 0.5rem;">
          Verifica Orari su Google Flights →
        </a>
      ` : '';

      resultBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #ded8cb; padding-bottom: 0.75rem;">
          <div>
            <h3 style="color: #191817; font-size: 1.35rem; font-weight: 800;">Bergamo → ${t.dest_out_name} • Rientro da ${t.origin_in_name}</h3>
            <div style="color: #ea580c; font-weight: 700; margin-top: 0.3rem;">${outShort} → ${inShort} (${t.nights} notti)</div>
            <div style="margin-top: 0.2rem;">
              <span style="color: #c2410c; font-weight: 700;">${t.jaw_badge}: ${t.jaw_desc}</span> • 
              <span style="color: #047857; font-weight: 700;">Solo Zainetto Gratuito</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 2.2rem; font-weight: 800; color: #ea580c; font-variant-numeric: tabular-nums;">${t.total_price} €</span>
            <div style="font-size: 0.72rem; color: #78716c; font-weight: 700; text-transform: uppercase;">TOTALE A/R FINITO</div>
          </div>
        </div>

        <div style="background: #ffffff; padding: 1.15rem; border: 1px solid #ded8cb; margin-bottom: 1rem; font-size: 0.95rem;">
          <div><strong>Andata:</strong> <span style="color: #1d4ed8; font-weight: 700;">${outDateFull}</span> • Ore ${t.time_out.includes(' ') ? t.time_out.split(' ')[1].substring(0, 5) : t.time_out} • Bergamo Orio → ${t.dest_out_name} • <strong>${t.price_out} €</strong></div>
          <div style="margin-top: 0.5rem;"><strong>Rientro:</strong> <span style="color: #047857; font-weight: 700;">${inDateFull}</span> • Ore ${t.time_in.includes(' ') ? t.time_in.split(' ')[1].substring(0, 5) : t.time_in} • ${t.origin_in_name} → Bergamo Orio • <strong>${t.price_in} €</strong></div>
        </div>

        <div class="card-actions">
          <a href="${t.booking_url}" target="_blank" rel="noopener noreferrer" class="cta-button">
            Prenota Volo da Bergamo (${outShort} → ${inShort}) • ${t.total_price} € →
          </a>
          ${comparatorBtn}
        </div>
      `;
    }
  } catch (err) {
    console.error('Errore custom search:', err);
    resultBox.style.display = 'block';
    resultBox.innerHTML = `<p style="color: #ef4444;">Errore di connessione al motore di ricerca.</p>`;
  } finally {
    btn.textContent = 'Calcola Prezzo Volo da Bergamo →';
    btn.disabled = false;
  }
}

// Refresh completo dei prezzi
async function refreshData() {
  const btn = document.getElementById('btn-refresh');
  const icon = btn.querySelector('.refresh-icon');
  icon.classList.add('spinning');
  btn.disabled = true;

  try {
    const res = await fetch('/api/refresh');
    if (!res.ok) throw new Error('Errore durante il refresh');
    await loadData();
  } catch (err) {
    console.error('Errore refresh:', err);
    alert('Errore durante l\'aggiornamento dei prezzi.');
  } finally {
    icon.classList.remove('spinning');
    btn.disabled = false;
  }
}

// Switch delle tab di navigazione
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));

  if (tabId === 'deals') {
    document.getElementById('tab-btn-deals').classList.add('active');
    document.getElementById('section-deals').classList.add('active');
  } else if (tabId === 'airlines') {
    document.getElementById('tab-btn-airlines').classList.add('active');
    document.getElementById('section-airlines').classList.add('active');
  } else if (tabId === 'holidays') {
    document.getElementById('tab-btn-holidays').classList.add('active');
    document.getElementById('section-holidays').classList.add('active');
  } else if (tabId === 'custom') {
    document.getElementById('tab-btn-custom').classList.add('active');
    document.getElementById('section-custom').classList.add('active');
    // Rende visibile il calendario se non ancora inizializzato
    renderCalendar();
  }
}
