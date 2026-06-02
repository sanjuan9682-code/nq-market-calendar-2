const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DAYS_ORDER = ["Lunes","Martes","Miércoles","Jueves","Viernes"];

const parseDir = (text="") => {
  if (!text) return "neutral";
  const t = text.toUpperCase();
  if (t.startsWith("📈") || t.includes("BULLISH")) return "bull";
  if (t.startsWith("📉") || t.includes("BEARISH")) return "bear";
  return "neutral";
};

const stripTag = (text="") => text.replace(/^(📈|📉|➡️)\s*(BULLISH|BEARISH|NEUTRO)\s*[-—]\s*/i, "").trim();

const fmtDate = () => {
  const d = new Date();
  return d.toLocaleDateString("es-CO", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
};

let scope = "today";
let calendarData = null;

// ── Auto Analysis Engine ───────────────────────────────────────────────────
function analyzeResult(ev) {
  // Si no hay dato real, no podemos analizar
  if (!ev.actual && !ev.real) return null;
  
  const actual = ev.actual || ev.real;
  const expected = ev.esperado || ev.estimate;
  
  if (!expected) return null;
  
  // Convertir a números si es posible
  const a = parseFloat(String(actual).replace(/[^0-9.\-]/g, ""));
  const e = parseFloat(String(expected).replace(/[^0-9.\-]/g, ""));
  
  if (isNaN(a) || isNaN(e)) return null;
  
  const diff = a - e;
  const pctDiff = e !== 0 ? ((diff / Math.abs(e)) * 100).toFixed(1) : "0";
  const isGreater = diff > 0;
  const isEqual = Math.abs(diff) < 0.0001;
  
  // Determinar dirección según el tipo de evento
  const name = (ev.nombre || "").toUpperCase();
  let dir, label, conclusion;
  
  if (isEqual) {
    dir = "neutral";
    label = "➡️ EN LÍNEA";
    conclusion = "El dato fue exactamente el esperado. Sin sorpresa para el mercado.";
  } else {
    // Reglas específicas por tipo de evento
    if (name.includes("CPI") || name.includes("PPI") || name.includes("PCE") || name.includes("INFLATION")) {
      // Inflación: mayor = bearish
      dir = isGreater ? "bear" : "bull";
      label = isGreater ? "📉 MAYOR (Bearish)" : "📈 MENOR (Bullish)";
      conclusion = isGreater 
        ? `Inflación ${pctDiff}% MAYOR a lo esperado. La Fed se ve obligada a mantener tasas altas. PRESIÓN BAJISTA para el NQ.` 
        : `Inflación ${pctDiff}% MENOR a lo esperado. La Fed gana margen para recortes. IMPULSO ALCISTA para el NQ.`;
    } else if (name.includes("EMPLOYMENT") || name.includes("NFP") || name.includes("NON-FARM")) {
      // Empleo: mayor = bearish (higher for longer)
      dir = isGreater ? "bear" : "bull";
      label = isGreater ? "📉 MAYOR (Bearish)" : "📈 MENOR (Bullish)";
      conclusion = isGreater
        ? `Empleo ${pctDiff}% MAYOR. Economía fuerte = Fed sin prisa por recortar. PRESIÓN BAJISTA para Tech.`
        : `Empleo ${pctDiff}% MENOR. Debilidad laboral alivia presión de la Fed. IMPULSO ALCISTA para Tech.`;
    } else if (name.includes("GDP")) {
      // GDP: mayor = bullish (si no viene con inflación)
      dir = isGreater ? "bull" : "bear";
      label = isGreater ? "📈 MAYOR (Bullish)" : "📉 MENOR (Bearish)";
      conclusion = isGreater
        ? `Crecimiento ${pctDiff}% MAYOR. Economía expansiva beneficia a ingresos de Tech. ALCISTA para NQ.`
        : `Crecimiento ${pctDiff}% MENOR. Señal de desaceleración. PRESIÓN BAJISTA.`;
    } else if (name.includes("PMI")) {
      // PMI: >50 = bullish, <50 = bearish
      dir = isGreater ? "bull" : "bear";
      label = isGreater ? "📈 MAYOR (Bullish)" : "📉 MENOR (Bearish)";
      conclusion = isGreater
        ? `PMI ${pctDiff}% MAYOR. Sector manufacturero/servicios en expansión. ALCISTA.`
        : `PMI ${pctDiff}% MENOR. Contracción sectorial. PRESIÓN BAJISTA.`;
    } else if (name.includes("RETAIL")) {
      dir = isGreater ? "bull" : "bear";
      label = isGreater ? "📈 MAYOR (Bullish)" : "📉 MENOR (Bearish)";
      conclusion = isGreater
        ? `Consumo ${pctDiff}% MAYOR. Gasto fuerte impulsa ingresos de Tech y e-commerce. ALCISTA.`
        : `Consumo ${pctDiff}% MENOR. Débilidad en gasto reduce guidance. PRESIÓN BAJISTA.`;
    } else {
      // Default: usar la lógica de escenarios pre-programada
      const esc = ev.escenarios || {};
      if (isGreater && esc.mayor_esperado) {
        dir = parseDir(esc.mayor_esperado);
        label = "📈 MAYOR";
        conclusion = stripTag(esc.mayor_esperado);
      } else if (!isGreater && esc.menor_esperado) {
        dir = parseDir(esc.menor_esperado);
        label = "📉 MENOR";
        conclusion = stripTag(esc.menor_esperado);
      } else {
        dir = "neutral";
        label = "➡️ EN LÍNEA";
        conclusion = "Dato sin desviación significativa del consenso.";
      }
    }
  }
  
  return { dir, label, conclusion, diff: diff.toFixed(2), pctDiff, actual, expected };
}

// ── Alert Banner ────────────────────────────────────────────────────────────
function updateAlertBanner(events) {
  const banner = $("#alert-banner");
  const textEl = $("#alert-text");
  const timerEl = $("#alert-timer");
  
  if (!banner || !textEl) return;
  
  // Buscar evento de alto impacto más próximo de hoy
  const todayEvents = events.filter(e => (e.impacto || "").toUpperCase() === "ALTO");
  
  if (todayEvents.length === 0) {
    banner.style.display = "none";
    return;
  }
  
  // Mostrar el primero
  const ev = todayEvents[0];
  banner.style.display = "";
  textEl.textContent = `${ev.nombre} — ${ev.hora_et || ""} ET (${ev.hora_co || ""})`;
  
  // Timer
  if (ev.hora_et) {
    updateTimer(ev.hora_et, timerEl);
    setInterval(() => updateTimer(ev.hora_et, timerEl), 60000);
  }
}

function updateTimer(etTime, el) {
  if (!etTime || !el) return;
  const now = new Date();
  const [h, m] = etTime.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  
  // Ajustar ET a hora local (Colombia = ET-1h)
  target.setHours(target.getHours() - 1);
  
  const diff = target - now;
  if (diff <= 0) {
    el.textContent = "⚠️ Evento en curso o ya pasó";
    el.style.color = "var(--bear)";
  } else {
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    el.textContent = `⏰ Faltan: ${hours}h ${mins}m`;
    el.style.color = hours < 1 ? "var(--bear)" : "var(--amber)";
  }
}

// ── Load & Render ─────────────────────────────────────────────────────────
async function loadData() {
  $("#content").classList.add("hidden");
  $("#error").classList.add("hidden");
  $("#loading").classList.remove("hidden");
  $("#status-dot").classList.add("offline");

  try {
    const res = await fetch("data/calendar.json?t=" + Date.now());
    if (!res.ok) throw new Error("HTTP " + res.status);
    calendarData = await res.json();
    render();
    $("#status-dot").classList.remove("offline");
  } catch (e) {
    console.error(e);
    $("#loading").classList.add("hidden");
    $("#error").classList.remove("hidden");
  }
}

function render() {
  $("#loading").classList.add("hidden");
  if (!calendarData) { $("#error").classList.remove("hidden"); return; }

  const container = $("#events-container");
  const earnContainer = $("#earnings-container");
  container.innerHTML = "";
  earnContainer.innerHTML = "";

  // Header info
  $("#header-date").textContent = (fmtDate().charAt(0).toUpperCase() + fmtDate().slice(1));
  if (calendarData.updatedAt) {
    $("#header-updated").textContent = "Actualizado: " + calendarData.updatedAt;
  }

  // Summary
  const summaryCard = $("#summary-card");
  if (calendarData.resumen_sesgo) {
    summaryCard.style.display = "";
    $("#summary-text").textContent = calendarData.resumen_sesgo;
  } else {
    summaryCard.style.display = "none";
  }

  // Filter events by scope
  let events = calendarData.eventos || [];
  if (scope === "today") {
    const todayName = new Date().toLocaleDateString("es-CO", { weekday: "long" });
    const cap = todayName.charAt(0).toUpperCase() + todayName.slice(1);
    events = events.filter(e => (e.dia || "").toLowerCase() === cap.toLowerCase());
  }

  // Update alert banner
  updateAlertBanner(events);

  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">😴</div>
        <div class="empty-title">Sin eventos de alto impacto</div>
        <div class="empty-desc">Día tranquilo para el NQ. Puedes operar con más libertad sin riesgo de noticias inesperadas.</div>
      </div>`;
  } else {
    // Group by day for week view
    const grouped = {};
    events.forEach((ev, i) => {
      const d = ev.dia || "Otro";
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push({ ...ev, _i: i });
    });
    const orderedDays = scope === "today" ? Object.keys(grouped) : DAYS_ORDER.filter(d => grouped[d]);

    orderedDays.forEach(day => {
      if (scope === "week" || orderedDays.length > 1) {
        const dayHeader = document.createElement("div");
        dayHeader.className = "section-title";
        dayHeader.textContent = "— " + day;
        container.appendChild(dayHeader);
      }
      (grouped[day] || []).forEach(ev => {
        container.appendChild(buildEventCard(ev));
      });
    });
  }

  // Earnings
  const earnings = (calendarData.earnings || []).slice(0, 20);
  if (earnings.length === 0) {
    earnContainer.innerHTML = `<div class="empty"><div class="empty-desc">Sin earnings reportados para este período.</div></div>`;
  } else {
    earnings.forEach(e => earnContainer.appendChild(buildEarningCard(e)));
  }

  $("#content").classList.remove("hidden");
}

function buildEventCard(ev) {
  const wrap = document.createElement("div");
  wrap.className = "event-card";
  wrap.dataset.id = ev._i;

  const badgeClass = (ev.impacto || "").toUpperCase() === "ALTO" ? "badge-alto" : "badge-medio";
  
  // Análisis automático de resultado real
  const analysis = analyzeResult(ev);
  let resultHTML = "";
  if (analysis) {
    const resultCls = analysis.dir === "bull" ? "result-bull" : analysis.dir === "bear" ? "result-bear" : "result-neu";
    resultHTML = `
      <div class="result-box ${resultCls}">
        <div class="result-label">RESULTADO REAL — ${analysis.label}</div>
        <div>Real: <strong>${analysis.actual}</strong> vs Esperado: <strong>${analysis.expected}</strong> (Dif: ${analysis.pctDiff}%)</div>
        <div style="margin-top:4px;font-weight:500;">${analysis.conclusion}</div>
      </div>
    `;
  }

  // Header
  const header = document.createElement("div");
  header.className = "card-header";
  header.innerHTML = `
    <div class="time-col">
      <div class="time-et">${ev.hora_et || ""}</div>
      <div class="time-co">${ev.hora_co || ""}</div>
    </div>
    <div class="card-body">
      <div class="card-title-row">
        <span class="card-title">${ev.nombre || ""}</span>
        <span class="badge ${badgeClass}">${ev.impacto || "MEDIO"}</span>
      </div>
      <div class="card-desc">${ev.descripcion || ""}</div>
      <div class="card-values">
        ${ev.esperado ? `<span class="card-value">Esperado: <strong class="exp-amber">${ev.esperado}</strong></span>` : ""}
        ${ev.anterior ? `<span class="card-value">Anterior: <strong class="exp-white">${ev.anterior}</strong></span>` : ""}
      </div>
      ${resultHTML}
    </div>
    <span class="chevron">▾</span>
  `;
  wrap.appendChild(header);

  // Panel (hidden by default, injected on click)
  wrap.addEventListener("click", () => toggleCard(wrap, ev));
  return wrap;
}

function toggleCard(wrap, ev) {
  const isExpanded = wrap.classList.contains("expanded");
  // Collapse all
  document.querySelectorAll(".event-card.expanded").forEach(c => {
    c.classList.remove("expanded");
    const p = c.querySelector(".panel");
    if (p) p.remove();
  });
  if (isExpanded) return;

  wrap.classList.add("expanded");
  const panel = document.createElement("div");
  panel.className = "panel";

  // Scenarios
  const scenarios = [
    { key: "mayor_esperado", label: "📈 Mayor que esperado", defaultDir: "bull" },
    { key: "menor_esperado", label: "📉 Menor que esperado", defaultDir: "bear" },
    { key: "en_linea", label: "➡️ En línea", defaultDir: "neutral" },
  ];

  const scRow = document.createElement("div");
  scRow.className = "scenarios";

  scenarios.forEach(sc => {
    const text = ev.escenarios?.[sc.key] || "";
    const dir = parseDir(text) || sc.defaultDir;
    const cleaned = stripTag(text) || (dir === "bull" ? "Reacción alcista probable para el NQ" : dir === "bear" ? "Reacción bajista probable para el NQ" : "Reacción neutral esperada");

    const map = { bull: ["scenario-bull", "sc-label-bull"], bear: ["scenario-bear", "sc-label-bear"], neutral: ["scenario-neu", "sc-label-neu"] };
    const [cls, lblCls] = map[dir];

    const box = document.createElement("div");
    box.className = "scenario " + cls;
    box.innerHTML = `
      <div class="scenario-label ${lblCls}">${sc.label}</div>
      <div class="scenario-text">${cleaned}</div>
    `;
    scRow.appendChild(box);
  });

  panel.appendChild(document.createElement("div")).className = "panel-label";
  panel.lastChild.textContent = "Escenarios para el NQ";
  panel.appendChild(scRow);

  // ICT Context
  if (ev.contexto_ict) {
    const ict = document.createElement("div");
    ict.className = "ict-box";
    ict.innerHTML = `<div class="ict-label">📊 Contexto ICT / NQ</div><div class="ict-text">${ev.contexto_ict}</div>`;
    panel.appendChild(ict);
  }

  wrap.appendChild(panel);
}

function buildEarningCard(e) {
  const wrap = document.createElement("div");
  wrap.className = "earn-card";
  const epsE = e.epsEstimate != null ? e.epsEstimate : "—";
  const epsA = e.epsActual != null ? e.epsActual : null;
  const epsStr = epsA != null ? `<strong>${epsA}</strong> (est. ${epsE})` : `Est. <strong>${epsE}</strong>`;
  const hourStr = e.hour ? (e.hour === "bmo" ? "Pre-market" : e.hour === "amc" ? "After-hours" : e.hour) : "";
  wrap.innerHTML = `
    <div class="earn-left">
      <span class="earn-ticker">${e.symbol || ""}</span>
      <span class="earn-name">${e.name || ""}</span>
    </div>
    <div class="earn-right">
      <div class="earn-eps">EPS: ${epsStr}</div>
      <div class="earn-date">${e.date || ""} ${hourStr}</div>
    </div>
  `;
  return wrap;
}

// Filters
$$(".btn-filter").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("active")) return;
    $$(".btn-filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    scope = btn.dataset.scope;
    render();
  });
});

$("#btn-refresh").addEventListener("click", loadData);
$("#btn-retry").addEventListener("click", loadData);

// Init
loadData();
