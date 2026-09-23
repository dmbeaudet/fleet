/* app.js — Fleet maintenance log
   Plain ES2020, no build step. Data lives in this browser (localStorage).
   Use Settings to export a JSON backup or move data to another device. */

/* ============================ storage ============================ */

const KEY = "fleet.v1";
const mem = {}; // fallback when localStorage is unavailable (private mode, sandboxes)

const store = {
  read(k) {
    try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; }
  },
  write(k, v) {
    try { localStorage.setItem(k, v); return true; }
    catch (e) { mem[k] = v; return false; }
  }
};

let state = { vehicles: [], settings: { apiKey: "", model: "claude-sonnet-4-6" } };
let persistent = true;

function load() {
  const raw = store.read(KEY);
  if (!raw) { state.vehicles = seedVehicles(); save(); return; }
  try {
    const parsed = JSON.parse(raw);
    state.vehicles = parsed.vehicles || [];
    state.settings = Object.assign(state.settings, parsed.settings || {});
  } catch (e) {
    console.warn("Saved data could not be read; starting from samples.", e);
    state.vehicles = seedVehicles();
  }
}

function save() {
  const ok = store.write(KEY, JSON.stringify(state));
  if (!ok && persistent) {
    persistent = false;
    toast("This browser is blocking local storage. Changes last until you close the tab — export a backup from Settings.");
  }
  return ok;
}

/* ============================ helpers ============================ */

const $ = (sel, root = document) => root.querySelector(sel);
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (n) => Number(n || 0).toLocaleString("en-US");
const today = () => new Date().toISOString().slice(0, 10);

function addMonths(iso, months) {
  const d = new Date(iso + "T12:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
}
function prettyDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function shortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
function catColor(key) {
  const c = CATEGORIES.find((c) => c.key === key);
  return c ? c.color : "#8da0b4";
}
function catLabel(key) {
  const c = CATEGORIES.find((c) => c.key === key);
  return c ? c.label : key;
}
function unitLabel(u, n) {
  if (u === "hr") return n === 1 ? "hour" : "hours";
  return "miles";
}
function unitShort(u) { return u === "hr" ? "hr" : "mi"; }

function toast(msg, ms = 3200) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), ms);
}

function vehicleTitle(v) {
  const desc = [v.year, v.make, v.model].filter(Boolean).join(" ");
  return { name: v.name || desc || "Untitled", desc: v.name ? desc : "" };
}

function procedureUrl(v, task) {
  if (task.link) return { url: task.link, label: "Procedure" };
  const desc = [v.year, v.make, v.model].filter(Boolean).join(" ") || v.name;
  const q = encodeURIComponent(`${desc} ${task.name} how to`);
  return { url: `https://www.google.com/search?q=${q}`, label: "Look up" };
}

/* ============================ status math ============================ */

/* A task is driven by whichever comes first: usage interval or calendar
   interval. pct is how much of that interval is used up. */
function taskStatus(v, t) {
  const out = { pct: 0, driver: "none", remainText: "—", status: "ok", dueText: "" };
  const parts = [];

  if (t.usage > 0 && t.lastReading != null) {
    const used = Math.max(0, (v.reading || 0) - t.lastReading);
    const pct = used / t.usage;
    const remain = t.lastReading + t.usage - (v.reading || 0);
    parts.push({
      pct, driver: "usage", remain,
      text: remain >= 0
        ? `in ${num(Math.round(remain))} ${unitShort(v.unit)}`
        : `${num(Math.abs(Math.round(remain)))} ${unitShort(v.unit)} over`,
      due: `at ${num(t.lastReading + t.usage)} ${unitShort(v.unit)}`
    });
  }
  if (t.months > 0 && t.lastDate) {
    const dueDate = addMonths(t.lastDate, t.months);
    const total = daysBetween(t.lastDate, dueDate) || 1;
    const gone = daysBetween(t.lastDate, today());
    const remain = daysBetween(today(), dueDate);
    parts.push({
      pct: gone / total, driver: "time", remain,
      text: remain >= 0
        ? (remain > 60 ? `in ${Math.round(remain / 30)} mo` : `in ${remain} days`)
        : (remain < -60 ? `${Math.round(Math.abs(remain) / 30)} mo over` : `${Math.abs(remain)} days over`),
      due: `by ${prettyDate(dueDate)}`
    });
  }

  if (!parts.length) return out;
  parts.sort((a, b) => b.pct - a.pct);
  const lead = parts[0];
  out.pct = lead.pct;
  out.driver = lead.driver;
  out.remainText = lead.text;
  out.dueText = lead.due;
  out.status = lead.pct >= 1 ? "overdue" : lead.pct >= 0.8 ? "soon" : "ok";
  return out;
}

function vehicleTasks(v) {
  return (v.tasks || [])
    .map((t) => ({ t, s: taskStatus(v, t) }))
    .sort((a, b) => b.s.pct - a.s.pct);
}

function vehicleSummary(v) {
  const rows = vehicleTasks(v);
  const overdue = rows.filter((r) => r.s.status === "overdue").length;
  const soon = rows.filter((r) => r.s.status === "soon").length;
  return { rows, overdue, soon, total: rows.length, top: rows[0] || null };
}

function fleetSummary() {
  let overdue = 0, soon = 0, clean = 0, top = null;
  state.vehicles.forEach((v) => {
    const s = vehicleSummary(v);
    overdue += s.overdue;
    soon += s.soon;
    if (!s.overdue && !s.soon) clean++;
    if (s.top && (!top || s.top.s.pct > top.s.pct)) top = { v, ...s.top };
  });
  return { overdue, soon, clean, top };
}

/* ============================ gauge ============================ */

function gauge(pct, color, size = 92) {
  const r = size / 2 - 9;
  const c = size / 2;
  const sweep = 250;                       // degrees of arc
  const start = 145;                       // start angle
  const circ = 2 * Math.PI * r;
  const arcLen = circ * (sweep / 360);
  const val = Math.max(0, Math.min(1.12, pct));
  const shown = Math.min(val, 1);
  const label = Math.round(pct * 100);
  return `
  <svg class="gauge" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}% of interval used">
    <g transform="rotate(${start} ${c} ${c})">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#2a3644" stroke-width="7"
              stroke-linecap="round" stroke-dasharray="${arcLen} ${circ}" />
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
              stroke-linecap="round" stroke-dasharray="${arcLen * shown} ${circ}" />
    </g>
    <text x="${c}" y="${c + 2}" text-anchor="middle" font-family="Saira Semi Condensed, sans-serif"
          font-size="${size * 0.27}" font-weight="600" fill="#e8eff5">${label}</text>
    <text x="${c}" y="${c + size * 0.19}" text-anchor="middle" font-family="Saira, sans-serif"
          font-size="${size * 0.12}" fill="#8da0b4">percent</text>
  </svg>`;
}

function statusColor(s) {
  return s === "overdue" ? "#e0575c" : s === "soon" ? "#f0a33b" : "#47b37c";
}

/* ============================ seed data ============================ */

function buildTasks(profileKey, reading, startDate) {
  const p = PROFILES[profileKey];
  if (!p) return [];
  return p.tasks.map((t) => {
    /* Assume the last service landed on the previous interval boundary.
       That gives a realistic spread of due dates on day one; correct any
       of them by logging a service or editing the task. */
    let lastReading = 0;
    if (t.u > 0) lastReading = Math.max(0, Math.floor((reading || 0) / t.u) * t.u);
    let lastDate = startDate || today();
    if (t.m > 0) {
      const backMonths = Math.min(t.m - 1, Math.floor(t.m * 0.45));
      lastDate = addMonths(today(), -backMonths);
    }
    return {
      id: uid(), name: t.n, group: t.g || "General",
      usage: t.u || 0, months: t.m || 0,
      lastReading: t.u > 0 ? lastReading : (reading || 0),
      lastDate, link: "", note: t.note || "", assumed: true
    };
  });
}

function makeVehicle(o) {
  const v = Object.assign({
    id: uid(), name: "", year: "", make: "", model: "", category: "autos",
    profile: "car_na", unit: "mi", reading: 0, readingDate: today(),
    photo: null, vin: "", notes: "", added: today(), tasks: [], history: []
  }, o);
  if (!v.tasks.length) v.tasks = buildTasks(v.profile, v.reading, v.added);
  return v;
}

function seedVehicles() {
  return [
    makeVehicle({
      name: "S3", year: "2020", make: "Audi", model: "S3",
      category: "autos", profile: "car_turbo", unit: "mi", reading: 48200,
      notes: "Stage 2 Cobb tune, EA888 Gen 3. Running a shorter oil interval because of it."
    }),
    makeVehicle({
      name: "Corolla", year: "2016", make: "Toyota", model: "Corolla",
      category: "autos", profile: "car_na", unit: "mi", reading: 96400,
      notes: "EVAP codes P0441/P0455/P0456 chased down — watch the purge valve."
    }),
    makeVehicle({
      name: "Zero-turn", year: "", make: "Kawasaki", model: "FR691V",
      category: "equipment", profile: "mower_small_engine", unit: "hr", reading: 310,
      notes: "Ran dry once and air-locked. Prime the pump with a syringe if it won't catch. Fuel pump 49040-0802."
    }),
    makeVehicle({
      name: "SeaRey", year: "", make: "Progressive Aerodyne", model: "SeaRey",
      category: "recreational", profile: "light_aircraft", unit: "hr", reading: 412,
      notes: "Based at 7B2. Rinse and inspect for corrosion after any salt water."
    }),
    makeVehicle({
      name: "Lake boat", year: "", make: "", model: "Outboard runabout",
      category: "boats", profile: "outboard", unit: "hr", reading: 145,
      notes: "Sample entry — rename it, set the real hours, or delete it."
    })
  ];
}

/* ============================ router ============================ */

function route() {
  const hash = location.hash.replace(/^#\/?/, "") || "fleet";
  const [page, arg] = hash.split("/");
  const view = $("#view");
  window.scrollTo(0, 0);
  if (page === "v" && arg) viewVehicle(view, arg);
  else if (page === "add") viewAdd(view);
  else if (page === "edit" && arg) viewAdd(view, arg);
  else if (page === "settings") viewSettings(view);
  else viewFleet(view);
}

window.addEventListener("hashchange", route);

/* ============================ fleet view ============================ */

let activeFilter = "all";

function viewFleet(root) {
  const f = fleetSummary();
  const counts = { all: state.vehicles.length };
  CATEGORIES.forEach((c) => { counts[c.key] = state.vehicles.filter((v) => v.category === c.key).length; });

  let nextLine = "Nothing scheduled yet. Add a vehicle to build its plan.";
  if (f.top) {
    const tt = vehicleTitle(f.top.v);
    const st = f.top.s;
    nextLine = `<b>${esc(tt.name)}</b> — ${esc(f.top.t.name)}, ${esc(st.remainText)}`;
  }

  const list = state.vehicles.filter((v) => activeFilter === "all" || v.category === activeFilter);

  root.innerHTML = `
    <div class="statusline">
      <div class="tally"><span class="n overdue">${f.overdue}</span><span class="l">overdue</span></div>
      <div class="tally"><span class="n soon">${f.soon}</span><span class="l">due soon</span></div>
      <div class="tally"><span class="n ok">${f.clean}</span><span class="l">vehicles clear</span></div>
      <div class="nextup">Next up: ${nextLine}</div>
    </div>

    <div class="rail" role="group" aria-label="Filter by category">
      <button class="chip" data-f="all" aria-pressed="${activeFilter === "all"}">All <span class="count">${counts.all}</span></button>
      ${CATEGORIES.map((c) => `
        <button class="chip" data-f="${c.key}" aria-pressed="${activeFilter === c.key}">
          <span class="dot" style="background:${c.color}"></span>${c.label} <span class="count">${counts[c.key] || 0}</span>
        </button>`).join("")}
    </div>

    ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `
      <div class="empty">
        <div>No ${activeFilter === "all" ? "vehicles" : catLabel(activeFilter).toLowerCase()} yet.</div>
        <a class="btn btn-primary" href="#/add">Add a vehicle</a>
      </div>`}
  `;

  root.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
    activeFilter = b.dataset.f;
    viewFleet(root);
  }));
  root.querySelectorAll(".card").forEach((el) => el.addEventListener("click", () => {
    location.hash = `#/v/${el.dataset.id}`;
  }));
}

function card(v) {
  const s = vehicleSummary(v);
  const t = vehicleTitle(v);
  const pill = s.overdue
    ? `<span class="pill overdue"><span class="dot"></span>${s.overdue} overdue</span>`
    : s.soon
      ? `<span class="pill soon"><span class="dot"></span>${s.soon} due soon</span>`
      : s.total
        ? `<span class="pill ok"><span class="dot"></span>up to date</span>`
        : `<span class="pill none">no plan yet</span>`;

  const segs = s.rows.slice(0, 12)
    .map((r) => `<span class="${r.s.status}"></span>`).join("") || `<span></span>`;

  return `
  <button class="card" data-id="${v.id}">
    <div class="photo">
      ${v.photo ? `<img src="${v.photo}" alt="" loading="lazy">` : `<div class="noimg">${silhouette(v.category)}</div>`}
      <span class="cat-tag"><span class="dot" style="background:${catColor(v.category)}"></span>${catLabel(v.category)}</span>
      <span class="card-name">
        <span class="n1">${esc(t.name)}</span>
        ${t.desc ? `<span class="n2">${esc(t.desc)}</span>` : ""}
      </span>
    </div>
    <div class="card-foot">
      <span class="odo"><span class="v">${num(v.reading)}</span><span class="u">${unitShort(v.unit)}</span></span>
      ${pill}
    </div>
    <div class="strip">${segs}</div>
  </button>`;
}

function silhouette(cat) {
  const c = "#3c4b5c";
  const paths = {
    autos: `<path d="M6 27h44M12 27l4-11h20l6 11M16 33a4 4 0 108 0 4 4 0 10-8 0M34 33a4 4 0 108 0 4 4 0 10-8 0" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    equipment: `<path d="M8 34a7 7 0 1014 0 7 7 0 10-14 0M34 30a10 10 0 1020 0 10 10 0 10-20 0M15 27V16h12l5 9h6" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    boats: `<path d="M8 33h40l-6 10H14zM28 31V12l14 9-14 4" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    recreational: `<path d="M4 30h48M28 30V16M10 30l8-14h20l8 14M20 36a4 4 0 108 0 4 4 0 10-8 0" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  };
  return `<svg width="72" height="52" viewBox="0 0 56 48" aria-hidden="true">${paths[cat] || paths.autos}</svg>`;
}

/* ============================ vehicle view ============================ */

function viewVehicle(root, id) {
  const v = state.vehicles.find((x) => x.id === id);
  if (!v) { location.hash = "#/fleet"; return; }
  const s = vehicleSummary(v);
  const t = vehicleTitle(v);
  const top = s.top;
  const assumedCount = (v.tasks || []).filter((x) => x.assumed).length;

  const groups = [
    { key: "overdue", label: "Due now", rows: s.rows.filter((r) => r.s.status === "overdue") },
    { key: "soon", label: "Coming up", rows: s.rows.filter((r) => r.s.status === "soon") },
    { key: "ok", label: "Not yet", rows: s.rows.filter((r) => r.s.status === "ok") }
  ];

  root.innerHTML = `
    <a class="back" href="#/fleet">← All vehicles</a>

    <section class="hero">
      <div class="hero-photo">
        ${v.photo ? `<img src="${v.photo}" alt="">` : `<div class="noimg">${silhouette(v.category)}</div>`}
      </div>
      <div class="hero-body">
        <div class="hero-title">
          <span class="cat-tag" style="position:static;display:inline-flex;margin-bottom:.4rem">
            <span class="dot" style="background:${catColor(v.category)}"></span>${catLabel(v.category)}
          </span>
          <div class="n1">${esc(t.name)}</div>
          <div class="n2">${esc(t.desc || PROFILES[v.profile]?.label || "")}</div>
        </div>

        ${top ? `
        <div class="gauge-row">
          ${gauge(top.s.pct, statusColor(top.s.status), 88)}
          <div class="gauge-note">
            <div class="k">Closest to due</div>
            <div class="t">${esc(top.t.name)}</div>
            <div class="s" style="color:${statusColor(top.s.status)}">${esc(top.s.remainText)} · ${esc(top.s.dueText)}</div>
          </div>
        </div>` : ""}

        <div class="reading-set">
          <div>
            <label class="field-label" for="rd">Current ${unitLabel(v.unit)}</label>
            <input class="tabular" id="rd" type="number" inputmode="numeric" value="${v.reading}" min="0" step="1">
          </div>
          <button class="btn btn-primary" id="saveReading">Update</button>
          <button class="btn" id="logAny">Log service</button>
        </div>
        <div class="hint">Last set ${prettyDate(v.readingDate)}</div>
      </div>
    </section>

    <div class="cols">
      <div>
        <section class="panel">
          <div class="panel-head">
            <h2>Maintenance schedule</h2>
            <div class="actions">
              <button class="btn btn-sm" id="addTask">Add item</button>
              <button class="btn btn-sm" id="rebuild">Rebuild from template</button>
            </div>
          </div>
          ${assumedCount ? `<p class="note">${assumedCount} item${assumedCount === 1 ? " has an" : "s have"} estimated last-service date${assumedCount === 1 ? "" : "s"}, worked back from your current reading. Log a service or edit the item to correct it.</p>` : ""}
          ${s.total ? groups.map((g) => g.rows.length ? `
            <div class="group-head">${g.label} <span class="rule"></span> <span>${g.rows.length}</span></div>
            <div class="tasks">${g.rows.map((r) => taskRow(v, r)).join("")}</div>` : "").join("")
      : `<div class="empty"><div>No schedule yet.</div><button class="btn btn-primary" id="buildNow">Build the baseline plan</button></div>`}
        </section>
      </div>

      <div>
        <section class="panel">
          <div class="panel-head"><h2>Service history</h2><span class="hint">${(v.history || []).length} entries</span></div>
          ${(v.history || []).length ? `<div class="log">${v.history
      .slice().sort((a, b) => b.date.localeCompare(a.date))
      .map((h) => `
              <div class="log-item">
                <div class="log-when">${shortDate(h.date)}<br>${num(h.reading)} ${unitShort(v.unit)}</div>
                <div class="log-what">
                  <div class="w1">${esc(h.name)}</div>
                  <div class="w2">${[h.cost ? "$" + num(h.cost) : "", esc(h.notes || "")].filter(Boolean).join(" · ") || prettyDate(h.date)}</div>
                </div>
              </div>`).join("")}</div>`
      : `<p class="hint">Nothing logged yet. Every service you log resets its interval and lands here.</p>`}
        </section>

        <section class="panel">
          <div class="panel-head"><h2>About this vehicle</h2></div>
          <div class="task-meta" style="margin-bottom:.7rem">
            ${v.vin ? `<span>VIN ${esc(v.vin)}</span>` : ""}
            <span>Plan: ${esc(PROFILES[v.profile]?.label || "custom")}</span>
            <span>Added ${prettyDate(v.added)}</span>
          </div>
          ${v.notes ? `<p style="margin:.2rem 0 .9rem">${esc(v.notes)}</p>` : ""}
          <div class="actions">
            <a class="btn btn-sm" href="#/edit/${v.id}">Edit details</a>
            <button class="btn btn-sm btn-danger" id="delVehicle">Delete vehicle</button>
          </div>
        </section>
      </div>
    </div>
  `;

  $("#saveReading").addEventListener("click", () => {
    const val = Math.max(0, Math.round(Number($("#rd").value) || 0));
    v.reading = val;
    v.readingDate = today();
    save();
    viewVehicle(root, id);
    toast(`${vehicleTitle(v).name} set to ${num(val)} ${unitShort(v.unit)}.`);
  });
  $("#logAny").addEventListener("click", () => logServiceDialog(v, null, () => viewVehicle(root, id)));
  const at = $("#addTask");
  if (at) at.addEventListener("click", () => editTaskDialog(v, null, () => viewVehicle(root, id)));
  const rb = $("#rebuild");
  if (rb) rb.addEventListener("click", () => rebuildPlan(v, () => viewVehicle(root, id)));
  const bn = $("#buildNow");
  if (bn) bn.addEventListener("click", () => rebuildPlan(v, () => viewVehicle(root, id)));
  $("#delVehicle").addEventListener("click", () => {
    if (!confirm(`Delete ${vehicleTitle(v).name} and its history? This can't be undone.`)) return;
    state.vehicles = state.vehicles.filter((x) => x.id !== v.id);
    save();
    location.hash = "#/fleet";
    toast("Vehicle deleted.");
  });

  root.querySelectorAll("[data-log]").forEach((b) => b.addEventListener("click", () =>
    logServiceDialog(v, b.dataset.log, () => viewVehicle(root, id))));
  root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () =>
    editTaskDialog(v, b.dataset.edit, () => viewVehicle(root, id))));
}

function taskRow(v, r) {
  const { t, s } = r;
  const link = procedureUrl(v, t);
  const pct = Math.max(0, Math.min(1, s.pct));
  return `
  <div class="task">
    <div class="task-name">
      ${esc(t.name)}
      <a class="lnk" href="${esc(link.url)}" target="_blank" rel="noopener">${link.label}</a>
    </div>
    <div class="task-right">
      <span class="remain ${s.status}">${esc(s.remainText)}</span>
      <button class="btn btn-sm" data-log="${t.id}">Log</button>
      <button class="btn btn-sm btn-ghost" data-edit="${t.id}" aria-label="Edit ${esc(t.name)}">Edit</button>
    </div>
    <div class="bar"><i class="${s.status}" style="width:${(pct * 100).toFixed(1)}%"></i></div>
    <div class="task-meta">
      <span>${intervalText(t, v.unit)}</span>
      <span>Last: ${t.lastReading != null && t.usage > 0 ? num(t.lastReading) + " " + unitShort(v.unit) + " · " : ""}${prettyDate(t.lastDate)}${t.assumed ? " (estimated)" : ""}</span>
      <span>Due ${esc(s.dueText)}</span>
      ${t.note ? `<span>${esc(t.note)}</span>` : ""}
    </div>
  </div>`;
}

function intervalText(t, unit) {
  const bits = [];
  if (t.usage > 0) bits.push(`every ${num(t.usage)} ${unitShort(unit)}`);
  if (t.months > 0) bits.push(`every ${t.months} mo`);
  if (!bits.length) return "no interval set";
  return bits.join(" or ");
}

function rebuildPlan(v, done) {
  if (v.tasks.length && !confirm("Replace the current schedule with a fresh template? Logged history is kept, but interval edits are lost.")) return;
  v.tasks = buildTasks(v.profile, v.reading, v.added);
  save();
  done();
  toast("Schedule rebuilt from the template.");
}

/* ============================ dialogs ============================ */

function openDialog(title, bodyHtml, footHtml) {
  $("#dlgTitle").textContent = title;
  $("#dlgBody").innerHTML = bodyHtml;
  $("#dlgFoot").innerHTML = footHtml;
  const d = $("#dlg");
  d.showModal();
  const first = $("#dlgBody input, #dlgBody select, #dlgBody textarea");
  if (first) setTimeout(() => first.focus(), 30);
  return d;
}

function logServiceDialog(v, taskId, done) {
  const task = (v.tasks || []).find((t) => t.id === taskId);
  const opts = [`<option value="">— other / unscheduled work —</option>`]
    .concat((v.tasks || []).map((t) => `<option value="${t.id}" ${t.id === taskId ? "selected" : ""}>${esc(t.name)}</option>`))
    .join("");

  openDialog("Log service", `
    <div class="form">
      <div>
        <label class="field-label" for="lgTask">What was done</label>
        <select class="input" id="lgTask">${opts}</select>
      </div>
      <div id="lgOtherWrap" style="display:${task ? "none" : "block"}">
        <label class="field-label" for="lgOther">Describe the work</label>
        <input class="input" id="lgOther" placeholder="e.g. replaced fuel pump">
      </div>
      <div class="form-row">
        <div>
          <label class="field-label" for="lgDate">Date</label>
          <input class="input" id="lgDate" type="date" value="${today()}">
        </div>
        <div>
          <label class="field-label" for="lgReading">${unitLabel(v.unit)[0].toUpperCase() + unitLabel(v.unit).slice(1)} at service</label>
          <input class="input tabular" id="lgReading" type="number" inputmode="numeric" value="${v.reading}">
        </div>
        <div>
          <label class="field-label" for="lgCost">Cost (optional)</label>
          <input class="input tabular" id="lgCost" type="number" inputmode="decimal" placeholder="0">
        </div>
      </div>
      <div>
        <label class="field-label" for="lgNotes">Notes — parts, torque, what you found</label>
        <textarea class="input" id="lgNotes" placeholder="Mobil 1 0W-40, Mann filter, drain plug 30 Nm"></textarea>
      </div>
      <label style="display:flex;gap:.5rem;align-items:center;font-size:.9rem">
        <input type="checkbox" id="lgBump" checked> Also update the vehicle's current reading
      </label>
    </div>
  `, `
    <button class="btn" value="cancel" type="submit">Cancel</button>
    <button class="btn btn-primary" id="lgSave" type="button">Save entry</button>
  `);

  $("#lgTask").addEventListener("change", (e) => {
    $("#lgOtherWrap").style.display = e.target.value ? "none" : "block";
  });

  $("#lgSave").addEventListener("click", () => {
    const tid = $("#lgTask").value;
    const t = (v.tasks || []).find((x) => x.id === tid);
    const name = t ? t.name : ($("#lgOther").value.trim() || "Unscheduled work");
    const date = $("#lgDate").value || today();
    const reading = Math.max(0, Math.round(Number($("#lgReading").value) || 0));
    const cost = Number($("#lgCost").value) || 0;
    const notes = $("#lgNotes").value.trim();

    v.history = v.history || [];
    v.history.push({ id: uid(), date, reading, taskId: tid || null, name, cost, notes });

    if (t) { t.lastReading = reading; t.lastDate = date; t.assumed = false; }
    if ($("#lgBump").checked && reading > (v.reading || 0)) { v.reading = reading; v.readingDate = date; }

    save();
    $("#dlg").close();
    done();
    toast(`Logged: ${name}.`);
  });
}

function editTaskDialog(v, taskId, done) {
  const t = (v.tasks || []).find((x) => x.id === taskId) || {
    id: null, name: "", group: "General", usage: 0, months: 0,
    lastReading: v.reading, lastDate: today(), link: "", note: "", assumed: false
  };
  const isNew = !t.id;

  openDialog(isNew ? "Add maintenance item" : "Edit maintenance item", `
    <div class="form">
      <div>
        <label class="field-label" for="etName">Item</label>
        <input class="input" id="etName" value="${esc(t.name)}" placeholder="Engine oil and filter">
      </div>
      <div>
        <label class="field-label" for="etGroup">System</label>
        <input class="input" id="etGroup" value="${esc(t.group)}" placeholder="Engine">
      </div>
      <div class="form-row">
        <div>
          <label class="field-label" for="etUsage">Every … ${unitShort(v.unit)}</label>
          <input class="input tabular" id="etUsage" type="number" inputmode="numeric" value="${t.usage || ""}" placeholder="0 = none">
        </div>
        <div>
          <label class="field-label" for="etMonths">Every … months</label>
          <input class="input tabular" id="etMonths" type="number" inputmode="numeric" value="${t.months || ""}" placeholder="0 = none">
        </div>
      </div>
      <p class="hint" style="margin:-.4rem 0 0">Set both and whichever arrives first is what's due.</p>
      <div class="form-row">
        <div>
          <label class="field-label" for="etLastR">Last done at (${unitShort(v.unit)})</label>
          <input class="input tabular" id="etLastR" type="number" inputmode="numeric" value="${t.lastReading ?? 0}">
        </div>
        <div>
          <label class="field-label" for="etLastD">Last done on</label>
          <input class="input" id="etLastD" type="date" value="${t.lastDate || today()}">
        </div>
      </div>
      <div>
        <label class="field-label" for="etLink">Procedure link (optional)</label>
        <input class="input" id="etLink" value="${esc(t.link)}" placeholder="https://… manual page, forum write-up, video">
        <p class="hint">Leave blank and the item links to a search for this exact vehicle and job.</p>
      </div>
      <div>
        <label class="field-label" for="etNote">Note</label>
        <input class="input" id="etNote" value="${esc(t.note)}" placeholder="Torque, part number, gotcha">
      </div>
    </div>
  `, `
    ${isNew ? "" : `<button class="btn btn-danger" id="etDel" type="button" style="margin-right:auto">Delete item</button>`}
    <button class="btn" value="cancel" type="submit">Cancel</button>
    <button class="btn btn-primary" id="etSave" type="button">Save item</button>
  `);

  $("#etSave").addEventListener("click", () => {
    const name = $("#etName").value.trim();
    if (!name) { toast("Give the item a name."); return; }
    const rec = {
      id: t.id || uid(),
      name,
      group: $("#etGroup").value.trim() || "General",
      usage: Math.max(0, Number($("#etUsage").value) || 0),
      months: Math.max(0, Number($("#etMonths").value) || 0),
      lastReading: Math.max(0, Number($("#etLastR").value) || 0),
      lastDate: $("#etLastD").value || today(),
      link: $("#etLink").value.trim(),
      note: $("#etNote").value.trim(),
      assumed: false
    };
    if (t.id) {
      const i = v.tasks.findIndex((x) => x.id === t.id);
      v.tasks[i] = rec;
    } else {
      v.tasks.push(rec);
    }
    save();
    $("#dlg").close();
    done();
    toast("Item saved.");
  });

  const del = $("#etDel");
  if (del) del.addEventListener("click", () => {
    v.tasks = v.tasks.filter((x) => x.id !== t.id);
    save();
    $("#dlg").close();
    done();
    toast("Item removed.");
  });
}

/* ============================ add / edit vehicle ============================ */

let pendingPhoto = null;

function viewAdd(root, editId) {
  const v = editId ? state.vehicles.find((x) => x.id === editId) : null;
  if (editId && !v) { location.hash = "#/fleet"; return; }
  pendingPhoto = v ? v.photo : null;

  const profileOptions = CATEGORIES.map((c) => `
    <optgroup label="${c.label}">
      ${Object.entries(PROFILES).filter(([, p]) => p.category === c.key)
      .map(([k, p]) => `<option value="${k}" ${v && v.profile === k ? "selected" : ""}>${esc(p.label)}</option>`).join("")}
    </optgroup>`).join("");

  root.innerHTML = `
    <a class="back" href="${v ? `#/v/${v.id}` : "#/fleet"}">← ${v ? "Back to vehicle" : "All vehicles"}</a>
    <h1 style="margin-bottom:1.1rem">${v ? "Edit " + esc(vehicleTitle(v).name) : "Add a vehicle"}</h1>

    <div class="cols">
      <section class="panel">
        <div class="form">
          <div class="form-row">
            <div>
              <label class="field-label" for="avName">Name it</label>
              <input class="input" id="avName" value="${v ? esc(v.name) : ""}" placeholder="Shop truck, Big green, S3">
            </div>
            <div>
              <label class="field-label" for="avYear">Year</label>
              <input class="input tabular" id="avYear" value="${v ? esc(v.year) : ""}" placeholder="2020">
            </div>
          </div>
          <div class="form-row">
            <div>
              <label class="field-label" for="avMake">Make</label>
              <input class="input" id="avMake" value="${v ? esc(v.make) : ""}" placeholder="Kubota">
            </div>
            <div>
              <label class="field-label" for="avModel">Model</label>
              <input class="input" id="avModel" value="${v ? esc(v.model) : ""}" placeholder="L3901">
            </div>
          </div>
          <div class="form-row">
            <div>
              <label class="field-label" for="avProfile">What kind of machine</label>
              <select class="input" id="avProfile">${profileOptions}</select>
              <p class="hint">Sets the category and the baseline schedule.</p>
            </div>
            <div>
              <label class="field-label" for="avUnit">Tracked by</label>
              <select class="input" id="avUnit">
                <option value="mi" ${v && v.unit === "mi" ? "selected" : ""}>Miles</option>
                <option value="hr" ${v && v.unit === "hr" ? "selected" : ""}>Hours</option>
              </select>
            </div>
            <div>
              <label class="field-label" for="avReading">Current reading</label>
              <input class="input tabular" id="avReading" type="number" inputmode="numeric" value="${v ? v.reading : ""}" placeholder="0">
            </div>
          </div>
          <div class="form-row">
            <div>
              <label class="field-label" for="avVin">VIN / serial (optional)</label>
              <input class="input" id="avVin" value="${v ? esc(v.vin) : ""}">
            </div>
            <div>
              <label class="field-label" for="avAdded">In service since</label>
              <input class="input" id="avAdded" type="date" value="${v ? v.added : today()}">
            </div>
          </div>
          <div>
            <label class="field-label" for="avNotes">Notes</label>
            <textarea class="input" id="avNotes" placeholder="Quirks, part numbers, what it's fitted with">${v ? esc(v.notes) : ""}</textarea>
          </div>
          <div class="actions">
            <button class="btn btn-primary" id="avSave">${v ? "Save changes" : "Add vehicle and build plan"}</button>
            <a class="btn btn-ghost" href="${v ? `#/v/${v.id}` : "#/fleet"}">Cancel</a>
          </div>
        </div>
      </section>

      <div>
        <section class="panel">
          <div class="panel-head"><h2>Photo</h2></div>
          <div class="drop" id="drop" tabindex="0" role="button" aria-label="Add a photo">
            ${pendingPhoto ? `<img src="${pendingPhoto}" alt=""><button class="btn btn-sm clear" id="clearPhoto" type="button">Remove</button>` : `
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/>
                <circle cx="8.5" cy="10" r="1.6" stroke="currentColor" stroke-width="1.6"/>
                <path d="M4 17l5-5 4 4 3-2 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div>Drop a photo here, or tap to choose one</div>
              <div class="hint">Resized to 1200px and stored in this browser</div>`}
          </div>
          <input type="file" id="file" accept="image/*" class="sr">
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Baseline schedule</h2></div>
          <p class="hint" id="planPreview"></p>
          <div class="actions" style="margin-top:.7rem">
            <button class="btn" id="research">Research this exact model</button>
          </div>
          <p class="hint" style="margin-top:.5rem">Looks up the manufacturer's published intervals for this year, make and model and tunes the plan to it. Needs an Anthropic API key — add one in Settings.</p>
          <div id="researchOut"></div>
        </section>
      </div>
    </div>
  `;

  const sel = $("#avProfile");
  const unitSel = $("#avUnit");
  function syncPreview() {
    const p = PROFILES[sel.value];
    $("#planPreview").textContent = p
      ? `${p.tasks.length} items from the ${p.label.toLowerCase()} template — oil, filters, fluids, wear items. Edit any of them after you add it.`
      : "";
    if (!v) unitSel.value = p ? p.unit : "mi";
  }
  sel.addEventListener("change", syncPreview);
  syncPreview();

  /* photo */
  const drop = $("#drop");
  const file = $("#file");
  drop.addEventListener("click", (e) => { if (e.target.id !== "clearPhoto") file.click(); });
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    if (e.dataTransfer.files[0]) handlePhoto(e.dataTransfer.files[0], drop);
  });
  file.addEventListener("change", () => { if (file.files[0]) handlePhoto(file.files[0], drop); });
  const cp = $("#clearPhoto");
  if (cp) cp.addEventListener("click", (e) => { e.stopPropagation(); pendingPhoto = null; viewAdd(root, editId); });

  /* research */
  $("#research").addEventListener("click", () => researchPlan({
    year: $("#avYear").value.trim(),
    make: $("#avMake").value.trim(),
    model: $("#avModel").value.trim(),
    profile: sel.value,
    unit: unitSel.value
  }, $("#researchOut"), (tasks) => { pendingResearch = tasks; }));

  /* save */
  $("#avSave").addEventListener("click", () => {
    const profile = sel.value;
    const data = {
      name: $("#avName").value.trim(),
      year: $("#avYear").value.trim(),
      make: $("#avMake").value.trim(),
      model: $("#avModel").value.trim(),
      profile,
      category: PROFILES[profile] ? PROFILES[profile].category : "autos",
      unit: unitSel.value,
      reading: Math.max(0, Math.round(Number($("#avReading").value) || 0)),
      readingDate: today(),
      vin: $("#avVin").value.trim(),
      added: $("#avAdded").value || today(),
      notes: $("#avNotes").value.trim(),
      photo: pendingPhoto
    };
    if (!data.name && !data.make && !data.model) { toast("Give it a name or a make and model."); return; }

    if (v) {
      const profileChanged = v.profile !== profile;
      Object.assign(v, data);
      if (profileChanged && confirm("The machine type changed. Rebuild the schedule from the new template?")) {
        v.tasks = buildTasks(profile, v.reading, v.added);
      }
      save();
      location.hash = `#/v/${v.id}`;
      toast("Changes saved.");
    } else {
      const nv = makeVehicle(data);
      if (pendingResearch && pendingResearch.length) {
        nv.tasks = pendingResearch.map((t) => normalizeResearchTask(t, nv));
        pendingResearch = null;
      }
      state.vehicles.push(nv);
      save();
      location.hash = `#/v/${nv.id}`;
      toast(`${vehicleTitle(nv).name} added with ${nv.tasks.length} scheduled items.`);
    }
  });
}

function handlePhoto(f, drop) {
  if (!f.type.startsWith("image/")) { toast("That file isn't an image."); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 1200;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      pendingPhoto = c.toDataURL("image/jpeg", 0.75);
      drop.innerHTML = `<img src="${pendingPhoto}" alt=""><button class="btn btn-sm clear" id="clearPhoto" type="button">Remove</button>`;
      $("#clearPhoto").addEventListener("click", (e) => {
        e.stopPropagation();
        pendingPhoto = null;
        route();
      });
    };
    img.onerror = () => toast("That image couldn't be read.");
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
}

/* ============================ research (optional) ============================ */

let pendingResearch = null;

function normalizeResearchTask(t, v) {
  return {
    id: uid(),
    name: String(t.name || "Service item").slice(0, 90),
    group: String(t.group || "General").slice(0, 30),
    usage: Math.max(0, Number(t.usage) || 0),
    months: Math.max(0, Number(t.months) || 0),
    lastReading: t.usage > 0 ? Math.max(0, Math.floor((v.reading || 0) / Number(t.usage)) * Number(t.usage)) : (v.reading || 0),
    lastDate: t.months > 0 ? addMonths(today(), -Math.floor(Number(t.months) * 0.45)) : today(),
    link: typeof t.link === "string" && /^https?:\/\//.test(t.link) ? t.link : "",
    note: String(t.note || "").slice(0, 160),
    assumed: true
  };
}

async function researchPlan(spec, outEl, onDone) {
  const key = state.settings.apiKey;
  if (!key) {
    outEl.innerHTML = `<p class="note" style="margin-top:.8rem">Add an Anthropic API key in <a href="#/settings">Settings</a> and this will pull the published intervals for your exact model. Until then, the template above is your starting point.</p>`;
    return;
  }
  const desc = [spec.year, spec.make, spec.model].filter(Boolean).join(" ");
  if (!desc) { toast("Fill in year, make and model first."); return; }

  outEl.innerHTML = `<p class="note" style="margin-top:.8rem">Looking up the maintenance schedule for ${esc(desc)}…</p>`;

  const unitWord = spec.unit === "hr" ? "engine hours" : "miles";
  const prompt = `Find the manufacturer's recommended maintenance schedule for a ${desc}.
Return ONLY a JSON array, no prose and no markdown fences. Each element:
{"name":"short item name","group":"system, e.g. Engine","usage":<interval in ${unitWord}, 0 if none>,"months":<calendar interval in months, 0 if none>,"note":"part number, capacity or gotcha, <=120 chars","link":"URL to the procedure or manual page, or empty string"}
Cover oil and filters, air and fuel filters, ignition, belts, fluids, brakes or drivetrain, cooling, and any items unique to this machine. Use normal service intervals, not severe-duty, and prefer the figures published by the manufacturer. 10-20 items.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: state.settings.model || "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }]
      })
    });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const match = text.replace(/```json|```/g, "").match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No schedule found in the response");
    const tasks = JSON.parse(match[0]);
    if (!Array.isArray(tasks) || !tasks.length) throw new Error("Empty schedule");

    onDone(tasks);
    outEl.innerHTML = `
      <p class="note" style="margin-top:.8rem">Found ${tasks.length} items for ${esc(desc)}. They replace the template when you save.</p>
      <div class="task-meta">${tasks.slice(0, 20).map((t) =>
      `<span>${esc(t.name)} — ${t.usage ? num(t.usage) + " " + unitShort(spec.unit) : ""}${t.usage && t.months ? " / " : ""}${t.months ? t.months + " mo" : ""}</span>`).join("")}</div>`;
    toast("Schedule found. Save the vehicle to keep it.");
  } catch (err) {
    outEl.innerHTML = `<p class="note" style="margin-top:.8rem">Couldn't fetch a schedule: ${esc(err.message)}. Check the key in Settings, or go with the template and edit intervals by hand.</p>`;
  }
}

/* ============================ settings ============================ */

function viewSettings(root) {
  const bytes = new Blob([JSON.stringify(state)]).size;
  root.innerHTML = `
    <a class="back" href="#/fleet">← All vehicles</a>
    <h1 style="margin-bottom:1.1rem">Settings</h1>
    <div class="cols">
      <div>
        <section class="panel">
          <div class="panel-head"><h2>Your data</h2></div>
          <p class="hint" style="margin-top:0">Everything lives in this browser — ${state.vehicles.length} vehicles, about ${(bytes / 1024).toFixed(0)} KB. Nothing is uploaded anywhere. Export a file to back it up or carry it to another device.</p>
          <div class="actions" style="margin-top:.9rem">
            <button class="btn btn-primary" id="exp">Export backup</button>
            <button class="btn" id="impBtn">Import backup</button>
            <input type="file" id="imp" accept="application/json" class="sr">
            <button class="btn btn-danger" id="reset">Reset to samples</button>
          </div>
          ${persistent ? "" : `<p class="note" style="margin-top:.9rem">This browser is blocking local storage, so changes only last until you close the tab. Export before you go.</p>`}
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Model research</h2></div>
          <p class="hint" style="margin-top:0">Optional. With an Anthropic API key, the add-vehicle page can look up the published schedule for an exact year, make and model instead of using the generic template. The key is stored in this browser only — if the page is public, anyone using this browser profile can read it.</p>
          <div class="form" style="margin-top:.8rem">
            <div>
              <label class="field-label" for="stKey">Anthropic API key</label>
              <input class="input" id="stKey" type="password" value="${esc(state.settings.apiKey)}" placeholder="sk-ant-…">
            </div>
            <div>
              <label class="field-label" for="stModel">Model</label>
              <input class="input" id="stModel" value="${esc(state.settings.model)}">
            </div>
            <div class="actions"><button class="btn btn-primary" id="stSave">Save key</button></div>
          </div>
        </section>
      </div>

      <div>
        <section class="panel">
          <div class="panel-head"><h2>How the math works</h2></div>
          <p style="margin-top:0;font-size:.92rem">Each item carries a usage interval, a calendar interval, or both. Whichever arrives first sets the due point. An item turns amber at 80 percent of its interval and red once it's past.</p>
          <p style="font-size:.92rem">When a plan is first built, each item's last service is assumed to have happened at the previous interval boundary below your current reading. That's a guess so the list is useful immediately — logging a service replaces it with the real figure.</p>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Templates on file</h2></div>
          <div class="task-meta">
            ${CATEGORIES.map((c) => `<span><b style="color:${c.color}">${c.label}:</b> ${Object.values(PROFILES).filter((p) => p.category === c.key).length}</span>`).join("")}
          </div>
          <p class="hint" style="margin-top:.6rem">Templates live in plans.js. Editing that file changes the baseline for every new vehicle.</p>
        </section>
      </div>
    </div>
  `;

  $("#exp").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fleet-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded.");
  });

  $("#impBtn").addEventListener("click", () => $("#imp").click());
  $("#imp").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        if (!parsed.vehicles) throw new Error("no vehicles in that file");
        if (!confirm(`Replace what's here with ${parsed.vehicles.length} vehicles from the backup?`)) return;
        state.vehicles = parsed.vehicles;
        state.settings = Object.assign(state.settings, parsed.settings || {});
        save();
        location.hash = "#/fleet";
        route();
        toast("Backup restored.");
      } catch (err) {
        toast("That file isn't a Fleet backup.");
      }
    };
    r.readAsText(f);
  });

  $("#reset").addEventListener("click", () => {
    if (!confirm("Wipe everything and start over with the sample vehicles?")) return;
    state.vehicles = seedVehicles();
    save();
    location.hash = "#/fleet";
    route();
    toast("Reset to samples.");
  });

  $("#stSave").addEventListener("click", () => {
    state.settings.apiKey = $("#stKey").value.trim();
    state.settings.model = $("#stModel").value.trim() || "claude-sonnet-4-6";
    save();
    toast("Saved.");
  });
}

/* ============================ boot ============================ */

/* Enter inside a dialog field runs the primary action instead of
   silently dismissing the dialog. */
$("#dlgBody").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") {
    e.preventDefault();
    const primary = $("#dlgFoot .btn-primary");
    if (primary) primary.click();
  }
});

load();
route();
