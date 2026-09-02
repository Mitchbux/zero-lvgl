/**
 * LVGL Zero DSL
 *
 * A DSL layer on top of ZeroJS that maps Zero syntax to LVGL-inspired
 * HTML components. Uses the Zero objectTypes mechanism so widgets are
 * written as bare `type ( ... )` blocks instead of the lower-level
 * `type +( ... )** ` syntax.
 *
 * Supported component types (mirrors lv_binding_js widget set):
 *   screen   — root container / display surface
 *   box      — generic container / panel
 *   label    — text label
 *   btn      — push button
 *   imgbtn   — image button
 *   checkbox — toggle checkbox
 *   switch   — toggle switch (on/off)
 *   slider   — horizontal range slider
 *   arc      — arc / circular progress indicator
 *   bar      — linear progress bar
 *   dropdown — select / dropdown list
 *   roller   — scroll-wheel picker
 *   textarea — multi-line text input
 *   list     — vertical list with items
 *   table    — data table
 *   chart    — line / bar chart
 *   tabview  — tabbed view container
 *   tab      — single tab (child of tabview)
 *   win      — window / titled panel
 *   led      — LED indicator dot
 *   spinner  — loading spinner
 *   img      — image widget
 *   msgbox   — modal message box
 *   kb       — on-screen keyboard
 *   calendar — date picker calendar
 *   colorpicker — HSV color wheel
 *   gauge    — speedometer gauge
 *
 * Common properties (set as child nodes inside each widget block):
 *   text       — main text / label content
 *   value      — numeric value (0–100 for sliders/bars/arcs)
 *   min        — range minimum
 *   max        — range maximum
 *   w          — width  (px, or "100%" string)
 *   h          — height (px, or "100%" string)
 *   x          — left offset (px) — uses absolute positioning inside screen
 *   y          — top  offset (px)
 *   color      — background / indicator colour (CSS colour string)
 *   textcolor  — text colour
 *   checked    — "true" | "false" — for checkbox / switch
 *   disabled   — "true" | "false"
 *   hidden     — "true" | "false"
 *   radius     — border-radius (px or "circle" → 50%)
 *   border     — border width (px)
 *   bordercolor — border colour
 *   shadow     — "true" to add drop shadow
 *   opacity    — 0–255 (255 = fully opaque)
 *   align      — "left" | "center" | "right" | "top" | "bottom" | "center" | "top_left" etc.
 *   pad        — padding (px)
 *   src        — image source URL (for img / imgbtn)
 *   options    — newline-separated option list for dropdown / roller
 *   cols       — comma-separated column headers for table
 *   rows       — newline-separated rows for table (cells tab-separated)
 *   data       — comma-separated y-values for chart
 *   charttype  — "line" | "bar" | "scatter"
 *   tabs       — comma-separated tab labels for tabview
 *   datelabel  — label id updated by native calendar date selection
 *   selectedcolor — initial selected-day color for calendar
 *   bindcalendar — calendar id controlled by a colorpicker
 *   style      — extra CSS class names
 *   note       — ignored by renderer (developer comment)
 */

import { parseScript, Z, Zero } from "./zero-runtime.js";
import WIDGET_CSS from './lvgl-widget.css?raw';

// ── Per-render state ──────────────────────────────────────────────────────────
let _events   = [];   // { id, domEvent, code }
let _idCounts = {};   // type → running counter

function resetRenderState() { _events = []; _idCounts = {}; }

/** Return the element ID for this widget key (user id prop or auto-generated). */
function mkId(key, type) {
  const custom = prop(key + ".id");
  if (custom) return custom;
  if (!_idCounts[type]) _idCounts[type] = 0;
  return `${type}-${_idCounts[type]++}`;
}

/** Register a DOM event binding (no-op if code is falsy). */
function queueEvent(elemId, domEvent, code) {
  if (code) _events.push({ id: elemId, domEvent, code });
}

/**
 * Extract JS event-handler code from a Zero node.
 *   onclick "alert('hi')"   → quoted string returned directly
 *   onclick { alert('hi') } → reads _rawCode stored by zero-runtime parser
 */
function extractEventCode(nodeKey) {
  const n = Z(nodeKey);
  if (!n) return null;
  const v = n._list.get(0);
  if (v !== undefined && v !== null) { const s = String(v).trim(); if (s) return s; }
  if (n._rawCode) {
    return String(n._rawCode)
      .replace(/\\"/g, '"').replace(/\\n/g, ' ')
      .replace(/\\t/g, ' ').replace(/\\\\/g, '\\');
  }
  return null;
}

// ── Object types recognised by the Zero DSL parser ───────────────────────────
export const LVGL_OBJECT_TYPES = new Set([
  "screen", "box", "label", "btn", "imgbtn",
  "checkbox", "switch", "slider", "arc", "bar",
  "dropdown", "roller", "textarea", "list", "table",
  "chart", "tabview", "tab", "win", "led",
  "spinner", "img", "msgbox", "kb", "calendar",
  "colorpicker", "gauge",
]);

// ── Utility helpers ───────────────────────────────────────────────────────────

/**
 * Read a scalar string from a Zero node.
 * Calls n.getter("") so that { code } getter blocks are evaluated at render time.
 * Falls back to the raw _list entry if the getter throws.
 */
function prop(nodeKey) {
  const n = Z(nodeKey);
  if (!n) return null;
  try {
    const v = n.getter("");
    const s = String(v ?? "").trim();
    return s !== "" ? s : null;
  } catch {
    // getter threw — fall back to raw list
    const v = n._list.get(0);
    return v !== undefined ? String(v).trim() : null;
  }
}

/** Safely parse int, returning fallback when NaN. */
function int(v, fallback = 0) {
  if (v === null || v === undefined) return fallback;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? fallback : n;
}

/** Convert a raw "w" / "h" value to a CSS dimension. */
function dim(v, fallback = null) {
  if (!v) return fallback;
  if (v.endsWith("%") || v === "auto") return v;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n + "px";
}

/** Build an inline style object (keys→values, nulls skipped). */
function style(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** Read optional Bulma/CSS utility class names from `style "..."`. */
function classes(key) {
  return (prop(key + ".style") ?? "")
    .split(/\s+/)
    .map(s => s.trim())
    .filter(s => /^[A-Za-z0-9_-]+$/.test(s))
    .join(" ");
}

/** Escape HTML entities. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape a value embedded in a single-quoted generated runtime string. */
function jsString(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// ── Walk helpers ──────────────────────────────────────────────────────────────

/**
 * Return all (type, instances[]) pairs that are direct children of parentKey.
 * A direct child container key looks like:  `<parentKey>.<type>`  (no "|" in the suffix).
 */
function childTypes(parentKey) {
  const prefix = parentKey + ".";
  const seen = new Set();
  const result = [];
  for (const [key] of Zero.storage ?? new Map()) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    if (rest.includes(".") || rest.includes("|")) continue;
    if (seen.has(rest)) continue;
    seen.add(rest);
    const n = Z(key);
    if (n && n.isObject) result.push({ type: rest, containerKey: key });
  }
  return result;
}

/** Return ordered instances from a container node's _list. */
function instances(containerKey) {
  const node = Z(containerKey);
  if (!node) return [];
  return [...node._list.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, v]) => v)
    .filter(Boolean);
}

// ── Per-component HTML renderers ──────────────────────────────────────────────

function renderLabel(key) {
  const text   = prop(key + ".text")   ?? "Label";
  const color  = prop(key + ".color");
  const tcolor = prop(key + ".textcolor");
  const size   = prop(key + ".size");
  const bold   = prop(key + ".bold");
  const align  = prop(key + ".align");
  const w      = dim(prop(key + ".w"));
  const h      = dim(prop(key + ".h"));
  const hidden = prop(key + ".hidden") === "true";
  const id     = mkId(key, "label");
  const onclick = extractEventCode(key + ".onclick");
  queueEvent(id, "click", onclick);
  const extra = classes(key);
  const st = style({
    color: tcolor,
    background: color,
    "font-size": size ? size + "px" : null,
    "font-weight": bold === "true" ? "bold" : null,
    "text-align": align ?? "left",
    width: w, height: h,
    display: hidden ? "none" : null,
    cursor: onclick ? "pointer" : null,
  });
  return `<span id="lvgl-${id}" class="lv-label ${extra}" style="${st}">${esc(text).replace(/\\n/g, "<br>")}</span>`;
}

function renderBtn(key) {
  const text     = prop(key + ".text")   ?? "Button";
  const color    = prop(key + ".color");
  const tcolor   = prop(key + ".textcolor");
  const w        = dim(prop(key + ".w"));
  const h        = dim(prop(key + ".h"));
  const disabled = prop(key + ".disabled") === "true";
  const radius   = prop(key + ".radius");
  const shadow   = prop(key + ".shadow") === "true";
  const id       = mkId(key, "btn");
  const extra    = classes(key);
  queueEvent(id, "click",     extractEventCode(key + ".onclick"));
  queueEvent(id, "mousedown", extractEventCode(key + ".onpress"));
  queueEvent(id, "mouseup",   extractEventCode(key + ".onrelease"));
  const st = style({
    background: color,
    color: tcolor,
    width: w, height: h,
    "border-radius": radius === "circle" ? "50%" : (radius ? radius + "px" : null),
    "box-shadow": shadow ? "0 4px 12px rgba(0,0,0,.45)" : null,
  });
  return `<button id="lvgl-${id}" class="lv-btn button ${extra}${disabled ? " lv-disabled" : ""}" ${disabled ? "disabled" : ""} style="${st}">${esc(text)}</button>`;
}

function renderCheckbox(key) {
  const text    = prop(key + ".text")    ?? "Checkbox";
  const checked = prop(key + ".checked") === "true";
  const disabled = prop(key + ".disabled") === "true";
  const id      = mkId(key, "checkbox");
  queueEvent(id + "-input", "change", extractEventCode(key + ".onchange"));
  return `<label id="lvgl-${id}" class="lv-checkbox${disabled ? " lv-disabled" : ""}">
    <input id="lvgl-${id}-input" type="checkbox" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
    <span class="lv-checkbox-mark"></span>
    <span class="lv-checkbox-text">${esc(text)}</span>
  </label>`;
}

function renderSwitch(key) {
  const checked  = prop(key + ".checked") === "true";
  const disabled = prop(key + ".disabled") === "true";
  const label    = prop(key + ".text");
  const id       = mkId(key, "switch");
  queueEvent(id + "-input", "change", extractEventCode(key + ".onchange"));
  return `<label id="lvgl-${id}" class="lv-switch${disabled ? " lv-disabled" : ""}">
    ${label ? `<span class="lv-switch-label">${esc(label)}</span>` : ""}
    <input id="lvgl-${id}-input" type="checkbox" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
    <span class="lv-switch-track"><span class="lv-switch-thumb"></span></span>
  </label>`;
}

function renderSlider(key) {
  const value   = int(prop(key + ".value"), 50);
  const min     = int(prop(key + ".min"),    0);
  const max     = int(prop(key + ".max"),  100);
  const w       = dim(prop(key + ".w"), "200px");
  const color   = prop(key + ".color");
  const disabled = prop(key + ".disabled") === "true";
  const id      = mkId(key, "slider");
  queueEvent(id + "-input", "input",
    extractEventCode(key + ".onchange") || extractEventCode(key + ".oninput"));
  const st = style({ width: w, "--lv-slider-color": color });
  return `<div id="lvgl-${id}" class="lv-slider-wrap" style="${st}">
    <input id="lvgl-${id}-input" class="lv-slider${disabled ? " lv-disabled" : ""}" type="range"
      min="${min}" max="${max}" value="${value}" ${disabled ? "disabled" : ""}
      style="${color ? `--lv-slider-color:${color}` : ""}">
  </div>`;
}

function renderArc(key) {
  const value = int(prop(key + ".value"), 30);
  const min   = int(prop(key + ".min"),    0);
  const max   = int(prop(key + ".max"),  100);
  const color = prop(key + ".color") ?? "var(--lv-primary)";
  const size  = int(prop(key + ".w"), 100);
  const text  = prop(key + ".text");
  const id    = mkId(key, "arc");
  const pct   = ((value - min) / (max - min)) * 100;
  const R = 40, cx = 50, cy = 50;
  const startAngle = 135, sweepAngle = 270;
  function polarToXY(deg, r) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  const sA = polarToXY(startAngle, R);
  const eA = polarToXY(startAngle + sweepAngle, R);
  const pA = polarToXY(startAngle + sweepAngle * (pct / 100), R);
  const bgPath = `M${sA.x},${sA.y} A${R},${R} 0 1 1 ${eA.x},${eA.y}`;
  const fgPath = pct > 0
    ? `M${sA.x},${sA.y} A${R},${R} 0 ${sweepAngle * (pct / 100) > 180 ? 1 : 0} 1 ${pA.x},${pA.y}`
    : "";
  return `<div id="lvgl-${id}" class="lv-arc" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 100 100" width="${size}" height="${size}">
      <path class="lv-arc-bg" d="${bgPath}" fill="none" stroke="var(--lv-surface-2)" stroke-width="10" stroke-linecap="round"/>
      <path class="lv-arc-fg" d="${fgPath}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>
      <text x="50" y="55" text-anchor="middle" fill="var(--lv-text)" font-size="18" font-family="inherit">${text ? esc(text) : value}</text>
    </svg>
  </div>`;
}

function renderBar(key) {
  const value = int(prop(key + ".value"), 0);
  const min   = int(prop(key + ".min"),   0);
  const max   = int(prop(key + ".max"), 100);
  const w     = dim(prop(key + ".w"), "200px");
  const h     = dim(prop(key + ".h"), "14px");
  const color = prop(key + ".color") ?? "var(--lv-primary)";
  const id    = mkId(key, "bar");
  const pct   = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return `<div id="lvgl-${id}" class="lv-bar" style="width:${w};height:${h}">
    <div class="lv-bar-fill" style="width:${pct}%;background:${color}"></div>
    <span class="lv-bar-label">${value}</span>
  </div>`;
}

function renderDropdown(key) {
  const options  = (prop(key + ".options") ?? "Option 1\nOption 2\nOption 3").split("\\n");
  const selected = int(prop(key + ".value"), 0);
  const w        = dim(prop(key + ".w"), "160px");
  const disabled = prop(key + ".disabled") === "true";
  const id       = mkId(key, "dropdown");
  const extra    = classes(key);
  queueEvent(id, "change", extractEventCode(key + ".onchange"));
  const opts = options.map((o, i) =>
    `<option ${i === selected ? "selected" : ""}>${esc(o.trim())}</option>`).join("");
  return `<select id="lvgl-${id}" class="lv-dropdown select ${extra}${disabled ? " lv-disabled" : ""}" style="width:${w}" ${disabled ? "disabled" : ""}>${opts}</select>`;
}

function renderRoller(key) {
  const options = (prop(key + ".options") ?? "Item 1\nItem 2\nItem 3").split("\\n");
  const selected = int(prop(key + ".value"), 0);
  const w = dim(prop(key + ".w"), "120px");
  return `<div class="lv-roller" style="width:${w}">
    ${options.map((o, i) =>
      `<div class="lv-roller-item${i === selected ? " lv-roller-selected" : ""}">${esc(o.trim())}</div>`
    ).join("")}
  </div>`;
}

function renderTextarea(key) {
  const text      = prop(key + ".text")        ?? "";
  const placeholder = prop(key + ".placeholder") ?? "Enter text…";
  const w         = dim(prop(key + ".w"),  "200px");
  const h         = dim(prop(key + ".h"),  "80px");
  const disabled  = prop(key + ".disabled") === "true";
  const id        = mkId(key, "textarea");
  const extra     = classes(key);
  queueEvent(id, "input",
    extractEventCode(key + ".oninput") || extractEventCode(key + ".onchange"));
  return `<textarea id="lvgl-${id}" class="lv-textarea textarea ${extra}${disabled ? " lv-disabled" : ""}"
    placeholder="${esc(placeholder)}" ${disabled ? "disabled" : ""}
    style="width:${w};height:${h}">${esc(text)}</textarea>`;
}

function renderList(key) {
  // Items can be set via `item "Text"` children or via `options "a\nb\nc"`
  const optionsRaw = prop(key + ".options");
  let items = [];
  if (optionsRaw) {
    items = optionsRaw.split("\\n").map(o => o.trim()).filter(Boolean);
  } else {
    const itemKey = key + ".item";
    const n = Z(itemKey);
    if (n) {
      let v = n.first;
      while (v !== null && v !== undefined) { items.push(v.trim()); v = n.next; }
    }
  }
  const w = dim(prop(key + ".w"), "200px");
  const extra = classes(key);
  const rows = items.map(i => `<li class="lv-list-item">${esc(i)}</li>`).join("");
  return `<ul class="lv-list menu-list ${extra}" style="width:${w}">${rows || '<li class="lv-list-item lv-muted">Empty list</li>'}</ul>`;
}

function renderTable(key) {
  const colsRaw = prop(key + ".cols") ?? "Col A,Col B,Col C";
  const rowsRaw = prop(key + ".rows") ?? "";
  const cols = colsRaw.split(",").map(c => c.trim());
  const rows = rowsRaw ? rowsRaw.split("\\n").map(r => r.split("\\t").map(c => c.trim())) : [];
  const thead = cols.map(c => `<th class="lv-th">${esc(c)}</th>`).join("");
  const tbody = rows.map(r =>
    `<tr>${r.map(c => `<td class="lv-td">${esc(c)}</td>`).join("")}</tr>`
  ).join("");
  const w = dim(prop(key + ".w"), "100%");
  const extra = classes(key);
  return `<table class="lv-table table ${extra}" style="width:${w}">
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody || `<tr><td class="lv-td lv-muted" colspan="${cols.length}">No rows</td></tr>`}</tbody>
  </table>`;
}

function renderChart(key) {
  const dataRaw  = prop(key + ".data")      ?? "10,40,30,70,55,80,20,60";
  const type     = prop(key + ".charttype") ?? "line";
  const w        = int(prop(key + ".w"),   260);
  const h        = int(key + ".h",   120) || 120;
  const hRaw     = prop(key + ".h");
  const hVal     = hRaw ? int(hRaw, 120) : 120;
  const color    = prop(key + ".color")     ?? "var(--lv-primary)";
  const label    = prop(key + ".text");
  const extra    = classes(key);

  const points   = dataRaw.split(",").map(Number).filter(v => !isNaN(v));
  if (points.length === 0) return `<div class="lv-chart lv-muted" style="width:${w}px;height:${hVal}px">No data</div>`;

  const maxVal   = Math.max(...points, 1);
  const svgW     = w;
  const svgH     = hVal;
  const padL = 28, padR = 8, padT = 8, padB = 24;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const toX = (i) => padL + (i / (points.length - 1 || 1)) * chartW;
  const toY = (v) => padT + chartH - (v / maxVal) * chartH;

  let content = "";
  if (type === "bar") {
    const bw = Math.max(4, (chartW / points.length) - 4);
    content = points.map((v, i) => {
      const x = padL + (i / points.length) * chartW + 2;
      const barH = (v / maxVal) * chartH;
      return `<rect x="${x}" y="${toY(v)}" width="${bw}" height="${barH}" fill="${color}" rx="2"/>`;
    }).join("");
  } else {
    const pts = points.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const area = `${padL},${padT + chartH} ` + points.map((v, i) => `${toX(i)},${toY(v)}`).join(" ") + ` ${toX(points.length - 1)},${padT + chartH}`;
    content = `
      <polygon points="${area}" fill="${color}" opacity="0.15"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${points.map((v, i) => `<circle cx="${toX(i)}" cy="${toY(v)}" r="3" fill="${color}"/>`).join("")}
    `;
  }

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const val = Math.round(maxVal * t);
    const y = toY(val);
    return `<text x="${padL - 4}" y="${y + 4}" text-anchor="end" fill="var(--lv-text-dim)" font-size="9">${val}</text>
            <line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--lv-surface-2)" stroke-width="0.5"/>`;
  }).join("");

  return `<div class="lv-chart-wrap ${extra}">
    ${label ? `<div class="lv-chart-title">${esc(label)}</div>` : ""}
    <svg class="lv-chart" width="${svgW}" height="${svgH}" style="overflow:visible">
      ${ticks}
      ${content}
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="var(--lv-border)" stroke-width="1"/>
      <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="var(--lv-border)" stroke-width="1"/>
    </svg>
  </div>`;
}

function renderTabview(key) {
  const tabsRaw = prop(key + ".tabs") ?? "Tab 1,Tab 2";
  const tabs    = tabsRaw.split(",").map(t => t.trim());
  const active  = int(prop(key + ".value"), 0);
  const w       = dim(prop(key + ".w"), "100%");
  const extra   = classes(key);
  const headers = tabs.map((t, i) =>
    `<div class="lv-tab-header${i === active ? " lv-tab-active" : ""}" data-tab="${i}">${esc(t)}</div>`
  ).join("");

  // Collect nested tab children
  const tabContainerKey = key + ".tab";
  const tabInstances = instances(tabContainerKey);
  const bodies = tabs.map((_, i) => {
    const inst = tabInstances[i];
    const content = inst ? renderChildren(inst._name) : "";
    return `<div class="lv-tab-body${i === active ? " lv-tab-body-active" : ""}" data-body="${i}">${content || '<span class="lv-muted">Empty tab</span>'}</div>`;
  }).join("");

  return `<div class="lv-tabview tabs-wrapper ${extra}" style="width:${w}">
    <div class="lv-tab-headers">${headers}</div>
    <div class="lv-tab-bodies">${bodies}</div>
  </div>`;
}

function renderWin(key) {
  const title = prop(key + ".text")  ?? "Window";
  const w     = dim(prop(key + ".w"), "280px");
  const h     = dim(prop(key + ".h"));
  const inner = renderChildren(key);
  return `<div class="lv-win" style="width:${w};${h ? "height:" + h : ""}">
    <div class="lv-win-header">
      <span class="lv-win-title">${esc(title)}</span>
      <span class="lv-win-close">✕</span>
    </div>
    <div class="lv-win-body">${inner}</div>
  </div>`;
}

function renderLed(key) {
  const color = prop(key + ".color")  ?? "var(--lv-primary)";
  const on    = prop(key + ".checked") !== "false";
  const size  = int(prop(key + ".w"), 20);
  const id    = mkId(key, "led");
  queueEvent(id, "click", extractEventCode(key + ".onclick"));
  return `<div id="lvgl-${id}" class="lv-led${on ? " lv-led-on" : ""}" style="width:${size}px;height:${size}px;--lv-led-color:${color};cursor:pointer"></div>`;
}

function renderSpinner(key) {
  const size  = int(prop(key + ".w"), 48);
  const color = prop(key + ".color") ?? "var(--lv-primary)";
  return `<div class="lv-spinner" style="width:${size}px;height:${size}px;border-top-color:${color}"></div>`;
}

function renderImg(key) {
  const src = prop(key + ".src") ?? "https://placehold.co/80x80?text=img";
  const w   = dim(prop(key + ".w"), "80px");
  const h   = dim(prop(key + ".h"), "80px");
  const alt = prop(key + ".text") ?? "image";
  const radius = prop(key + ".radius");
  const st = style({
    width: w, height: h,
    "border-radius": radius === "circle" ? "50%" : (radius ? radius + "px" : null),
    "object-fit": "cover",
  });
  return `<img class="lv-img" src="${esc(src)}" alt="${esc(alt)}" style="${st}">`;
}

function renderMsgbox(key) {
  const title   = prop(key + ".text")    ?? "Message";
  const body    = prop(key + ".body")    ?? "";
  const btns    = (prop(key + ".buttons") ?? "OK").split(",").map(b => b.trim());
  const w       = dim(prop(key + ".w"), "260px");
  return `<div class="lv-msgbox" style="width:${w}">
    <div class="lv-msgbox-title">${esc(title)}</div>
    ${body ? `<div class="lv-msgbox-body">${esc(body).replace(/\\n/g, "<br>")}</div>` : ""}
    <div class="lv-msgbox-btns">
      ${btns.map(b => `<button class="lv-btn lv-btn-sm">${esc(b)}</button>`).join("")}
    </div>
  </div>`;
}

function renderKb(key) {
  const rows = [
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["z","x","c","v","b","n","m","⌫"],
    ["123","Space","↵"],
  ];
  const w = dim(prop(key + ".w"), "320px");
  const keys = rows.map(row =>
    `<div class="lv-kb-row">${row.map(k =>
      `<button class="lv-kb-key${k === "Space" ? " lv-kb-space" : ""}">${k}</button>`
    ).join("")}</div>`
  ).join("");
  return `<div class="lv-kb" style="width:${w}">${keys}</div>`;
}

function renderCalendar(key) {
  const w = dim(prop(key + ".w"), "280px");
  const id = mkId(key, "calendar");
  const dateLabel = prop(key + ".datelabel");
  const selectedColor = prop(key + ".selectedcolor") ?? "#4a90e2";
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" });
  const year  = today.getFullYear();
  const days  = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const header = days.map(d => `<th class="lv-cal-day">${d}</th>`).join("");
  let cells = Array(firstDay).fill(`<td></td>`);
  for (let i = 1; i <= daysInMonth; i++) {
    const active = i === today.getDate() ? " lv-cal-today lv-cal-selected" : "";
    const date = `${year}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    cells.push(`<td class="lv-cal-num${active}" data-day="${i}" data-date="${date}">${i}</td>`);
  }
  queueEvent(id, "click", `
    var day=event.target.closest('.lv-cal-num');if(!day)return;
    event.currentTarget.querySelectorAll('.lv-cal-selected').forEach(function(cell){
      cell.classList.remove('lv-cal-selected');
      cell.style.removeProperty('background');
      cell.style.removeProperty('color');
      cell.style.removeProperty('box-shadow');
    });
    day.classList.add('lv-cal-selected');
    ${dateLabel ? `lvgl.text('${jsString(dateLabel)}',day.dataset.date);` : ""}
    var source=document.querySelector('[data-bind-calendar="${jsString(id)}"]');
    if(source)lvgl.calendarDayColor('${jsString(id)}',source.value);
  `);
  queueEvent(id, "click", extractEventCode(key + ".onclick"));
  while (cells.length % 7 !== 0) cells.push(`<td></td>`);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7)
    rows.push(`<tr>${cells.slice(i, i+7).join("")}</tr>`);
  return `<div id="lvgl-${id}" class="lv-calendar" style="width:${w};--lv-selected-color:${esc(selectedColor)}">
    <div class="lv-cal-header">
      <span class="lv-cal-arrow">‹</span>
      <span class="lv-cal-month">${month} ${year}</span>
      <span class="lv-cal-arrow">›</span>
    </div>
    <table class="lv-cal-table"><thead><tr>${header}</tr></thead><tbody>${rows.join("")}</tbody></table>
  </div>`;
}

function renderColorpicker(key) {
  const size  = int(prop(key + ".w"), 120);
  const color = prop(key + ".color") ?? "#4a90e2";
  const id = mkId(key, "colorpicker");
  const bindCalendar = prop(key + ".bindcalendar");
  if (bindCalendar) {
    queueEvent(id + "-input", "input", `
      lvgl.colorpicker('${jsString(id)}',event.target.value);
      lvgl.calendarDayColor('${jsString(bindCalendar)}',event.target.value);
    `);
  }
  queueEvent(
    id + "-input",
    "input",
    extractEventCode(key + ".oninput") || extractEventCode(key + ".onchange")
  );
  return `<div id="lvgl-${id}" class="lv-colorpicker" style="width:${size}px;height:${size}px">
    <div class="lv-cp-wheel" style="width:${size}px;height:${size}px;
      background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);
      border-radius:50%;"></div>
    <div class="lv-cp-cursor" style="background:${color}"></div>
    <input id="lvgl-${id}-input" class="lv-cp-input" type="color" value="${esc(color)}"${bindCalendar ? ` data-bind-calendar="${esc(bindCalendar)}"` : ""} aria-label="Choose a color">
  </div>`;
}

function renderGauge(key) {
  const value = int(prop(key + ".value"), 40);
  const min   = int(prop(key + ".min"),    0);
  const max   = int(prop(key + ".max"),  100);
  const color = prop(key + ".color") ?? "var(--lv-primary)";
  const size  = int(prop(key + ".w"), 120);
  const label = prop(key + ".text");
  const pct   = (value - min) / (max - min);
  const deg   = -135 + pct * 270;
  return `<div class="lv-gauge" style="width:${size}px;height:${size}px">
    <div class="lv-gauge-track"></div>
    <div class="lv-gauge-needle" style="transform:rotate(${deg}deg);border-top-color:${color}"></div>
    <div class="lv-gauge-center">
      <span class="lv-gauge-val">${value}</span>
      ${label ? `<span class="lv-gauge-label">${esc(label)}</span>` : ""}
    </div>
  </div>`;
}

function renderBox(key) {
  const color  = prop(key + ".color");
  const w      = dim(prop(key + ".w"));
  const h      = dim(prop(key + ".h"));
  const radius = prop(key + ".radius");
  const border = prop(key + ".border");
  const bcolor = prop(key + ".bordercolor");
  const pad    = prop(key + ".pad");
  const shadow = prop(key + ".shadow") === "true";
  const hidden = prop(key + ".hidden") === "true";
  const extra  = classes(key);
  const st = style({
    background: color,
    width: w, height: h,
    "border-radius": radius === "circle" ? "50%" : (radius ? radius + "px" : null),
    "border": border ? `${border}px solid ${bcolor ?? "var(--lv-border)"}` : null,
    padding: pad ? pad + "px" : null,
    "box-shadow": shadow ? "0 4px 16px rgba(0,0,0,.4)" : null,
    display: hidden ? "none" : null,
  });
  const inner = renderChildren(key);
  return `<div class="lv-box ${extra}" style="${st}">${inner}</div>`;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

const RENDERERS = {
  label:       renderLabel,
  btn:         renderBtn,
  imgbtn:      renderBtn,
  checkbox:    renderCheckbox,
  switch:      renderSwitch,
  slider:      renderSlider,
  arc:         renderArc,
  bar:         renderBar,
  dropdown:    renderDropdown,
  roller:      renderRoller,
  textarea:    renderTextarea,
  list:        renderList,
  table:       renderTable,
  chart:       renderChart,
  tabview:     renderTabview,
  tab:         (key) => renderChildren(key),
  win:         renderWin,
  led:         renderLed,
  spinner:     renderSpinner,
  img:         renderImg,
  msgbox:      renderMsgbox,
  kb:          renderKb,
  calendar:    renderCalendar,
  colorpicker: renderColorpicker,
  gauge:       renderGauge,
  box:         renderBox,
};

/**
 * Render all recognised child widgets under a given parent key.
 * Returns an HTML string.
 */
export function renderChildren(parentKey) {
  const children = childTypes(parentKey);
  const ordered = children.flatMap(({ type, containerKey }) =>
    instances(containerKey).map(inst => ({ type, inst }))
  ).sort((a, b) =>
    (a.inst._renderOrder ?? Number.MAX_SAFE_INTEGER) -
    (b.inst._renderOrder ?? Number.MAX_SAFE_INTEGER)
  );
  return ordered.map(({ type, inst }) => {
    const renderer = RENDERERS[type];
    return renderer ? renderer(inst._name) : "";
  }).join("\n");
}

// ── Event script + full-document builder ──────────────────────────────────────

function buildEventScript() {
  const bindings = _events.map(({ id, domEvent, code }) =>
    `  _e=document.getElementById('lvgl-${id}');if(_e)_e.addEventListener('${domEvent}',function(event){${code}});`
  ).join('\n');
  return `(function(){
  var lvgl={
    get:function(id){return document.getElementById('lvgl-'+id);},
    text:function(id,v){var e=document.getElementById('lvgl-'+id);if(e)e.textContent=v;},
    html:function(id,v){var e=document.getElementById('lvgl-'+id);if(e)e.innerHTML=v;},
    bg:function(id,v){var e=document.getElementById('lvgl-'+id);if(e)e.style.background=v;},
    color:function(id,v){var e=document.getElementById('lvgl-'+id);if(e)e.style.color=v;},
     colorpicker:function(id,v){
       var e=document.getElementById('lvgl-'+id);if(!e)return;
       var c=e.querySelector('.lv-cp-cursor');if(c)c.style.background=v;
       var input=document.getElementById('lvgl-'+id+'-input');if(input)input.value=v;
     },
     calendarDayColor:function(id,v){
       var e=document.getElementById('lvgl-'+id);if(!e)return;
       var day=e.querySelector('.lv-cal-selected')||e.querySelector('.lv-cal-today');
       if(day){
         day.style.setProperty('background',v,'important');
         day.style.color='#fff';
         day.style.boxShadow='0 0 8px 3px '+v;
       }
     },
    show:function(id,vis){var e=document.getElementById('lvgl-'+id);if(e)e.style.display=vis===false?'none':'';},
    hide:function(id){lvgl.show(id,false);},
    val:function(id,v){
      var e=document.getElementById('lvgl-'+id+'-input')||document.getElementById('lvgl-'+id);
      if(!e)return 0;
      if(v!==undefined)e.value=v;else return parseFloat(e.value)||0;
    },
    arc:function(id,value,min,max,color){
      var el=document.getElementById('lvgl-'+id);if(!el)return;
      min=min!==undefined?min:0;max=max!==undefined?max:100;
      var pct=Math.max(0,Math.min(100,(value-min)/(max-min)*100));
      var R=40,cx=50,cy=50,sA=135,sw=270;
      function pt(d,r){var rad=(d-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};}
      var s=pt(sA,R),p=pt(sA+sw*pct/100,R);
      var fg=el.querySelector('.lv-arc-fg');
      if(fg){
        fg.setAttribute('d',pct>0?'M'+s.x+','+s.y+' A'+R+','+R+' 0 '+(sw*pct/100>180?1:0)+' 1 '+p.x+','+p.y:'');
        if(color)fg.setAttribute('stroke',color);
      }
      var txt=el.querySelector('text');if(txt)txt.textContent=value;
    },
    bar:function(id,value,min,max,color){
      var el=document.getElementById('lvgl-'+id);if(!el)return;
      min=min!==undefined?min:0;max=max!==undefined?max:100;
      var pct=Math.max(0,Math.min(100,(value-min)/(max-min)*100));
      var fill=el.querySelector('.lv-bar-fill');if(fill){fill.style.width=pct+'%';if(color)fill.style.background=color;}
      var lbl=el.querySelector('.lv-bar-label');if(lbl)lbl.textContent=value;
    },
    led:function(id,on,color){
      var el=document.getElementById('lvgl-'+id);if(!el)return;
      el.classList.toggle('lv-led-on',on!==false);
      if(color){el.style.background=on!==false?color:'';el.style.boxShadow=on!==false?'0 0 10px 3px '+color:'';}
    },
    tab:function(tvEl,n){
      if(typeof tvEl==='string'){tvEl=document.getElementById('lvgl-'+tvEl);}
      if(!tvEl){
        var all=document.querySelectorAll('.lv-tabview');
        if(all.length>0)tvEl=all[0]; else return;
      }
      var hs=tvEl.querySelectorAll('.lv-tab-header');
      var bs=tvEl.querySelectorAll('.lv-tab-body');
      hs.forEach(function(h){h.classList.remove('lv-tab-active');});
      bs.forEach(function(b){b.classList.remove('lv-tab-body-active');});
      if(hs[n])hs[n].classList.add('lv-tab-active');
      if(bs[n])bs[n].classList.add('lv-tab-body-active');
    },
    state:{},
    _c:{},
    count:function(key,d){lvgl._c[key]=(lvgl._c[key]||0)+(d||1);return lvgl._c[key];},
  };
  window.lvgl=lvgl;
  var _e;
${bindings}
  // Auto-init tab switching for all tabviews
  document.querySelectorAll('.lv-tabview').forEach(function(tv){
    var hs=tv.querySelectorAll('.lv-tab-header');
    var bs=tv.querySelectorAll('.lv-tab-body');
    hs.forEach(function(h,i){
      h.style.cursor='pointer';
      h.addEventListener('click',function(){ lvgl.tab(tv,i); });
    });
  });
})();`;
}

const SCRIPT_OPEN = "<scr" + "ipt>";
const SCRIPT_CLOSE = "</scr" + "ipt>";

function buildFullDoc(bodyHtml, script) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{height:100%;overflow:hidden;}
body{margin:0;padding:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;overflow:hidden;}
.lv-screen{transform-origin:top center;flex-shrink:0;}
${WIDGET_CSS}
</style>
</head>
<body>
${bodyHtml}
${SCRIPT_OPEN}${script}${SCRIPT_CLOSE}
${SCRIPT_OPEN}
(function(){
  function fit(){
    var s=document.querySelector('.lv-screen');
    if(!s)return;
    // Reset transform so we measure the natural size
    s.style.transform='none';
    var sw=s.offsetWidth,sh=s.offsetHeight;
    if(!sw||!sh)return;
    var vw=window.innerWidth,vh=window.innerHeight;
    // Allow slight upscale; cap at 1.5 to avoid extreme blowup
    var scale=Math.min(vw/sw,vh/sh,1.5);
    // Apply scale around element center so flex centering works correctly
    s.style.transform='scale('+scale+')';
    s.style.transformOrigin='center center';
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fit);}else{fit();}
  window.addEventListener('resize',fit);
})();
${SCRIPT_CLOSE}
</body>
</html>`;
}

// ── Screen renderer ───────────────────────────────────────────────────────────

function renderScreen(key) {
  const color = prop(key + ".color") ?? "#1a1a2e";
  const w     = dim(prop(key + ".w"), "360px");
  const h     = dim(prop(key + ".h"), "640px");
  const title = prop(key + ".text");
  const inner = renderChildren(key);
  return `<div class="lv-screen" style="background:${color};width:${w};height:${h}">
    ${title ? `<div class="lv-screen-title">${esc(title)}</div>` : ""}
    <div class="lv-screen-body">${inner}</div>
  </div>`;
}

// ── Main parse + render entry point ──────────────────────────────────────────

/**
 * parseAndRender(dslText)
 *
 * Parses a Zero LVGL DSL string and returns an HTML string representing
 * the described UI.  Each `screen ( ... )` block becomes a device-frame
 * container; top-level widgets outside a screen appear in a plain wrapper.
 */
export function parseAndRender(dslText) {
  // Clear Zero storage + per-render state so each call starts clean
  if (Zero.storage) Zero.storage.clear();
  resetRenderState();

  try {
    parseScript(dslText, LVGL_OBJECT_TYPES);
  } catch (err) {
    return buildFullDoc(`<div class="lv-error">Parse error: ${esc(String(err))}</div>`, '');
  }

  const html = [];

  // Render screen instances if any
  const screenContainer = Z("zero.screen");
  if (screenContainer && screenContainer._list.size > 0) {
    for (const [, inst] of screenContainer._list) {
      html.push(renderScreen(inst._name));
    }
  }

  // Render top-level widgets (direct children of zero root, outside any screen)
  const topChildren = childTypes("zero").filter(c => c.type !== "screen");
  for (const { type, containerKey } of topChildren) {
    const renderer = RENDERERS[type];
    if (!renderer) continue;
    for (const inst of instances(containerKey)) {
      html.push(renderer(inst._name));
    }
  }

  const bodyHtml = html.length === 0
    ? `<div class="lv-empty">No components found. Write some Zero DSL in the editor.</div>`
    : html.join('\n');

  return buildFullDoc(bodyHtml, buildEventScript());
}
