/**
 * Zero DSL → native LVGL C compiler.
 *
 * The output targets LVGL 9.x and keeps AVR constraints in mind:
 * - no heap-owned style descriptors
 * - no CSS or browser runtime
 * - gradients are reduced to LVGL's two-stop native gradient
 * - Bulma classes become direct LVGL text/layout/graphic style calls
 * - JavaScript event bodies become compiling C callback stubs with TODO notes
 */

import { parseScript, Z, Zero } from "./zero-runtime.js";

const OBJECT_TYPES = new Set([
  "screen", "box", "label", "btn", "imgbtn", "checkbox", "switch",
  "slider", "arc", "bar", "dropdown", "roller", "textarea", "list",
  "table", "chart", "tabview", "tab", "win", "led", "spinner", "img",
  "msgbox", "kb", "calendar", "colorpicker", "gauge",
]);

const BULMA_COLORS = {
  "is-primary": "485FC7",
  "is-link": "3E8ED0",
  "is-success": "48C78E",
  "is-warning": "FFE08A",
  "is-danger": "F14668",
  "is-dark": "363636",
};

const C_KEYWORDS = new Set([
  "auto", "break", "case", "char", "const", "continue", "default", "do",
  "double", "else", "enum", "extern", "float", "for", "goto", "if", "inline",
  "int", "long", "register", "restrict", "return", "short", "signed",
  "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned",
  "void", "volatile", "while", "_Alignas", "_Alignof", "_Atomic", "_Bool",
  "_Complex", "_Generic", "_Imaginary", "_Noreturn", "_Static_assert",
  "_Thread_local",
]);

function prop(key, name) {
  const node = Z(`${key}.${name}`);
  if (!node || node._rawCode) return null;
  const value = node._list.get(0);
  return value === undefined ? null : String(value).trim() || null;
}

function rawEvent(key, name) {
  const node = Z(`${key}.${name}`);
  if (!node) return null;
  return node._rawCode || node._list.get(0) || null;
}

function children(parentKey) {
  const prefix = `${parentKey}.`;
  const found = [];
  const seen = new Set();
  for (const [storageKey] of Zero.storage ?? new Map()) {
    if (!storageKey.startsWith(prefix)) continue;
    const rest = storageKey.slice(prefix.length);
    if (rest.includes(".") || rest.includes("|") || seen.has(rest)) continue;
    const container = Z(storageKey);
    if (!container?.isObject) continue;
    seen.add(rest);
    for (const [, instance] of container._list) {
      if (instance) found.push({ type: rest, instance });
    }
  }
  return found.sort((a, b) =>
    (a.instance._renderOrder ?? Number.MAX_SAFE_INTEGER) -
    (b.instance._renderOrder ?? Number.MAX_SAFE_INTEGER)
  );
}

function cString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

function cComment(value) {
  return String(value ?? "").replace(/\*\//g, "* /").replace(/\s+/g, " ").trim();
}

function identifier(value, fallback) {
  const clean = String(value ?? fallback)
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^[^A-Za-z_]/, "_$&");
  return clean || fallback;
}

function allocateSymbol(ctx, value, fallback) {
  const baseIdentifier = identifier(value, fallback);
  const safeBase = C_KEYWORDS.has(baseIdentifier) ? `zero_${baseIdentifier}` : baseIdentifier;
  let symbol = safeBase;
  let suffix = 2;
  while (ctx.symbols.has(symbol)) symbol = `${safeBase}_${suffix++}`;
  ctx.symbols.add(symbol);
  return symbol;
}

function colorInfo(value) {
  const colors = String(value ?? "").match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) ?? [];
  const normalize = (hex) => {
    const raw = hex.slice(1);
    return raw.length === 3
      ? raw.split("").map((digit) => digit + digit).join("").toUpperCase()
      : raw.toUpperCase();
  };
  return {
    primary: colors[0] ? normalize(colors[0]) : null,
    secondary: colors[1] ? normalize(colors[1]) : null,
    gradient: String(value ?? "").includes("gradient") && colors.length > 1,
    horizontal: /(?:90deg|to right)/i.test(String(value ?? "")),
  };
}

function dimension(value) {
  if (!value || value === "auto") return null;
  if (value.endsWith("%")) return `lv_pct(${parseInt(value, 10) || 0})`;
  return String(parseInt(value, 10) || 0);
}

function number(value, fallback = 0) {
  const parsed = parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitEscaped(value) {
  return String(value ?? "").split(/\\n|\n|,/).map((item) => item.trim()).filter(Boolean);
}

function compileBulma(lines, variable, classValue, type) {
  const classes = new Set(String(classValue ?? "").split(/\s+/).filter(Boolean));
  const colorClass = Object.keys(BULMA_COLORS).find((name) => classes.has(name));
  if (colorClass) {
    lines.push(`  lv_obj_set_style_bg_color(${variable}, lv_color_hex(0x${BULMA_COLORS[colorClass]}), 0);`);
    lines.push(`  lv_obj_set_style_bg_opa(${variable}, LV_OPA_COVER, 0);`);
    if (colorClass === "is-warning") {
      lines.push(`  lv_obj_set_style_text_color(${variable}, lv_color_hex(0x3B2F10), 0);`);
    } else {
      lines.push(`  lv_obj_set_style_text_color(${variable}, lv_color_white(), 0);`);
    }
  }
  if (classes.has("columns")) {
    lines.push(`  lv_obj_set_flex_flow(${variable}, LV_FLEX_FLOW_ROW);`);
    lines.push(`  lv_obj_set_flex_align(${variable}, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);`);
  }
  if (classes.has("is-multiline")) {
    lines.push(`  lv_obj_set_flex_flow(${variable}, LV_FLEX_FLOW_ROW_WRAP);`);
  }
  if (classes.has("column")) {
    lines.push(`  lv_obj_set_flex_grow(${variable}, 1);`);
  }
  if (classes.has("box")) {
    lines.push(`  lv_obj_set_style_bg_color(${variable}, lv_color_hex(0x12121F), 0);`);
    lines.push(`  lv_obj_set_style_bg_opa(${variable}, LV_OPA_COVER, 0);`);
    lines.push(`  lv_obj_set_style_border_color(${variable}, lv_color_hex(0x2A2A4A), 0);`);
    lines.push(`  lv_obj_set_style_border_width(${variable}, 1, 0);`);
    lines.push(`  lv_obj_set_style_radius(${variable}, 12, 0);`);
    lines.push(`  lv_obj_set_style_pad_all(${variable}, 10, 0);`);
  }
  if (classes.has("notification")) {
    lines.push(`  lv_obj_set_style_radius(${variable}, 12, 0);`);
    lines.push(`  lv_obj_set_style_pad_all(${variable}, 12, 0);`);
  }
  if (classes.has("tag")) {
    lines.push(`  lv_obj_set_style_radius(${variable}, LV_RADIUS_CIRCLE, 0);`);
    lines.push(`  lv_obj_set_style_pad_hor(${variable}, 8, 0);`);
    lines.push(`  lv_obj_set_style_pad_ver(${variable}, 3, 0);`);
    if (!colorClass) {
      lines.push(`  lv_obj_set_style_bg_color(${variable}, lv_color_hex(0x485FC7), 0);`);
      lines.push(`  lv_obj_set_style_bg_opa(${variable}, LV_OPA_COVER, 0);`);
      lines.push(`  lv_obj_set_style_text_color(${variable}, lv_color_white(), 0);`);
    }
  }
  if (classes.has("title")) {
    lines.push("#if LV_FONT_MONTSERRAT_20");
    lines.push(`  lv_obj_set_style_text_font(${variable}, &lv_font_montserrat_20, 0);`);
    lines.push("#endif");
    lines.push(`  lv_obj_set_style_text_color(${variable}, lv_color_white(), 0);`);
  }
  if (classes.has("subtitle")) {
    lines.push(`  lv_obj_set_style_text_color(${variable}, lv_color_hex(0x99A4B8), 0);`);
  }
  if (classes.has("is-rounded")) {
    lines.push(`  lv_obj_set_style_radius(${variable}, LV_RADIUS_CIRCLE, 0);`);
  }
  if (classes.has("is-fullwidth")) {
    lines.push(`  lv_obj_set_width(${variable}, lv_pct(100));`);
  }
  if (classes.has("is-small")) {
    lines.push(`  lv_obj_set_style_pad_hor(${variable}, 10, 0);`);
    lines.push(`  lv_obj_set_style_pad_ver(${variable}, 5, 0);`);
  }
  if (type === "table" && classes.has("is-striped")) {
    lines.push(`  lv_obj_set_style_bg_color(${variable}, lv_color_hex(0x17172A), LV_PART_ITEMS);`);
  }
}

function compileCommon(ctx, variable, type, key) {
  const lines = ctx.lines;
  const width = dimension(prop(key, "w"));
  const height = dimension(prop(key, "h"));
  const x = prop(key, "x");
  const y = prop(key, "y");
  const background = colorInfo(prop(key, "color"));
  const textColor = colorInfo(prop(key, "textcolor"));
  const radius = prop(key, "radius");
  const border = prop(key, "border");
  const borderColor = colorInfo(prop(key, "bordercolor"));
  const pad = prop(key, "pad");
  const opacity = prop(key, "opacity");
  const align = prop(key, "align");
  const fontSize = number(prop(key, "size"), 0);

  // Bulma is the baseline theme. Explicit DSL properties below intentionally
  // win so C output matches the browser bridge's authoring semantics.
  compileBulma(lines, variable, prop(key, "style"), type);
  if (width) lines.push(`  lv_obj_set_width(${variable}, ${width});`);
  if (height) lines.push(`  lv_obj_set_height(${variable}, ${height});`);
  if (x || y) lines.push(`  lv_obj_set_pos(${variable}, ${number(x)}, ${number(y)});`);
  if (background.primary) {
    lines.push(`  lv_obj_set_style_bg_color(${variable}, lv_color_hex(0x${background.primary}), 0);`);
    lines.push(`  lv_obj_set_style_bg_opa(${variable}, LV_OPA_COVER, 0);`);
    if (background.gradient) {
      lines.push(`  lv_obj_set_style_bg_grad_color(${variable}, lv_color_hex(0x${background.secondary}), 0);`);
      lines.push(`  lv_obj_set_style_bg_grad_dir(${variable}, ${background.horizontal ? "LV_GRAD_DIR_HOR" : "LV_GRAD_DIR_VER"}, 0);`);
    }
  }
  if (textColor.primary) lines.push(`  lv_obj_set_style_text_color(${variable}, lv_color_hex(0x${textColor.primary}), 0);`);
  if (radius) lines.push(`  lv_obj_set_style_radius(${variable}, ${radius === "circle" ? "LV_RADIUS_CIRCLE" : number(radius)}, 0);`);
  if (border) lines.push(`  lv_obj_set_style_border_width(${variable}, ${number(border)}, 0);`);
  if (borderColor.primary) lines.push(`  lv_obj_set_style_border_color(${variable}, lv_color_hex(0x${borderColor.primary}), 0);`);
  if (pad) lines.push(`  lv_obj_set_style_pad_all(${variable}, ${number(pad)}, 0);`);
  if (opacity) lines.push(`  lv_obj_set_style_opa(${variable}, ${Math.max(0, Math.min(255, number(opacity, 255)))}, 0);`);
  if (align) {
    const textAlign = align === "center" ? "LV_TEXT_ALIGN_CENTER" : align === "right" ? "LV_TEXT_ALIGN_RIGHT" : "LV_TEXT_ALIGN_LEFT";
    lines.push(`  lv_obj_set_style_text_align(${variable}, ${textAlign}, 0);`);
  }
  if (fontSize > 0) {
    const available = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];
    const nearest = available.reduce((best, size) =>
      Math.abs(size - fontSize) < Math.abs(best - fontSize) ? size : best
    );
    lines.push(`#if LV_FONT_MONTSERRAT_${nearest}`);
    lines.push(`  lv_obj_set_style_text_font(${variable}, &lv_font_montserrat_${nearest}, 0);`);
    lines.push("#endif");
  }
  if (prop(key, "bold") === "true") {
    lines.push(`  /* Bold requested for ${variable}: assign an enabled bold lv_font_t here; LVGL does not synthesize font weight. */`);
  }
  if (prop(key, "shadow") === "true") {
    lines.push(`  lv_obj_set_style_shadow_width(${variable}, 18, 0);`);
    lines.push(`  lv_obj_set_style_shadow_opa(${variable}, LV_OPA_30, 0);`);
  }
  if (prop(key, "hidden") === "true") lines.push(`  lv_obj_add_flag(${variable}, LV_OBJ_FLAG_HIDDEN);`);
  if (prop(key, "disabled") === "true") lines.push(`  lv_obj_add_state(${variable}, LV_STATE_DISABLED);`);
}

function compileEvent(ctx, variable, key, eventName, lvEvent) {
  const source = rawEvent(key, eventName);
  if (!source) return;
  const handler = `zero_${variable}_${eventName}`;
  if (!ctx.handlers.has(handler)) {
    ctx.handlers.set(handler, [
      `static void ${handler}(lv_event_t *event) {`,
      "  LV_UNUSED(event);",
      `  /* TODO: translate Zero event logic: ${cComment(source)} */`,
      "}",
    ].join("\n"));
  }
  ctx.lines.push(`  lv_obj_add_event_cb(${variable}, ${handler}, ${lvEvent}, NULL);`);
}

function compileNode(ctx, type, key, parent) {
  const variable = allocateSymbol(ctx, prop(key, "id"), `${type}_${++ctx.count}`);
  const lines = ctx.lines;
  const text = prop(key, "text");

  if (type === "tab") {
    lines.push(`  lv_obj_t *${variable} = lv_tabview_add_tab(${parent}, "${cString(text || ctx.tabLabels.get(key) || "Tab")}");`);
  } else if (type === "screen" || type === "box") {
    lines.push(`  lv_obj_t *${variable} = lv_obj_create(${parent});`);
    lines.push(`  lv_obj_set_flex_flow(${variable}, LV_FLEX_FLOW_COLUMN);`);
  } else if (type === "label") {
    lines.push(`  lv_obj_t *${variable} = lv_label_create(${parent});`);
    lines.push(`  lv_label_set_text(${variable}, "${cString(text || "Label")}");`);
    lines.push(`  lv_label_set_long_mode(${variable}, LV_LABEL_LONG_WRAP);`);
  } else if (type === "btn" || type === "imgbtn") {
    const labelVariable = allocateSymbol(ctx, `${variable}_label`, "button_label");
    lines.push(`  lv_obj_t *${variable} = lv_button_create(${parent});`);
    lines.push(`  lv_obj_t *${labelVariable} = lv_label_create(${variable});`);
    lines.push(`  lv_label_set_text(${labelVariable}, "${cString(text || "Button")}");`);
    lines.push(`  lv_obj_center(${labelVariable});`);
  } else if (type === "checkbox") {
    lines.push(`  lv_obj_t *${variable} = lv_checkbox_create(${parent});`);
    lines.push(`  lv_checkbox_set_text(${variable}, "${cString(text || "Checkbox")}");`);
    if (prop(key, "checked") === "true") lines.push(`  lv_obj_add_state(${variable}, LV_STATE_CHECKED);`);
  } else if (type === "switch") {
    lines.push(`  lv_obj_t *${variable} = lv_switch_create(${parent});`);
    if (prop(key, "checked") === "true") lines.push(`  lv_obj_add_state(${variable}, LV_STATE_CHECKED);`);
  } else if (type === "slider" || type === "bar" || type === "arc" || type === "gauge") {
    const ctor = type === "slider" ? "lv_slider_create" : type === "bar" ? "lv_bar_create" : "lv_arc_create";
    lines.push(`  lv_obj_t *${variable} = ${ctor}(${parent});`);
    const min = number(prop(key, "min"), 0);
    const max = number(prop(key, "max"), 100);
    const value = number(prop(key, "value"), type === "gauge" ? 40 : 50);
    if (type === "slider") {
      lines.push(`  lv_slider_set_range(${variable}, ${min}, ${max});`);
      lines.push(`  lv_slider_set_value(${variable}, ${value}, LV_ANIM_OFF);`);
    } else if (type === "bar") {
      lines.push(`  lv_bar_set_range(${variable}, ${min}, ${max});`);
      lines.push(`  lv_bar_set_value(${variable}, ${value}, LV_ANIM_OFF);`);
    } else {
      lines.push(`  lv_arc_set_range(${variable}, ${min}, ${max});`);
      lines.push(`  lv_arc_set_value(${variable}, ${value});`);
      if (type === "gauge") lines.push(`  lv_obj_remove_flag(${variable}, LV_OBJ_FLAG_CLICKABLE);`);
    }
  } else if (type === "dropdown") {
    lines.push(`  lv_obj_t *${variable} = lv_dropdown_create(${parent});`);
    lines.push(`  lv_dropdown_set_options(${variable}, "${cString(splitEscaped(prop(key, "options")).join("\\n"))}");`);
  } else if (type === "roller") {
    lines.push(`  lv_obj_t *${variable} = lv_roller_create(${parent});`);
    lines.push(`  lv_roller_set_options(${variable}, "${cString(splitEscaped(prop(key, "options")).join("\\n"))}", LV_ROLLER_MODE_NORMAL);`);
  } else if (type === "textarea") {
    lines.push(`  lv_obj_t *${variable} = lv_textarea_create(${parent});`);
    if (prop(key, "placeholder")) lines.push(`  lv_textarea_set_placeholder_text(${variable}, "${cString(prop(key, "placeholder"))}");`);
    if (text) lines.push(`  lv_textarea_set_text(${variable}, "${cString(text)}");`);
  } else if (type === "list") {
    lines.push(`  lv_obj_t *${variable} = lv_list_create(${parent});`);
    for (const item of splitEscaped(prop(key, "options"))) {
      lines.push(`  lv_list_add_text(${variable}, "${cString(item)}");`);
    }
  } else if (type === "table") {
    const columns = String(prop(key, "cols") || "").split(",").map((item) => item.trim()).filter(Boolean);
    const rows = splitEscaped(prop(key, "rows")).map((row) => row.split(/\\t|\t/));
    lines.push(`  lv_obj_t *${variable} = lv_table_create(${parent});`);
    lines.push(`  lv_table_set_column_count(${variable}, ${Math.max(1, columns.length)});`);
    columns.forEach((column, index) => lines.push(`  lv_table_set_cell_value(${variable}, 0, ${index}, "${cString(column)}");`));
    rows.forEach((row, rowIndex) => row.forEach((cell, columnIndex) =>
      lines.push(`  lv_table_set_cell_value(${variable}, ${rowIndex + 1}, ${columnIndex}, "${cString(cell)}");`)
    ));
  } else if (type === "chart") {
    const seriesVariable = allocateSymbol(ctx, `${variable}_series`, "chart_series");
    const values = String(prop(key, "data") || "").split(",").map((item) => number(item)).filter(Number.isFinite);
    const color = colorInfo(prop(key, "color")).primary || "4A90E2";
    lines.push(`  lv_obj_t *${variable} = lv_chart_create(${parent});`);
    lines.push(`  lv_chart_set_type(${variable}, ${prop(key, "charttype") === "bar" ? "LV_CHART_TYPE_BAR" : "LV_CHART_TYPE_LINE"});`);
    lines.push(`  lv_chart_set_point_count(${variable}, ${Math.max(1, values.length)});`);
    lines.push(`  lv_chart_series_t *${seriesVariable} = lv_chart_add_series(${variable}, lv_color_hex(0x${color}), LV_CHART_AXIS_PRIMARY_Y);`);
    values.forEach((value) => lines.push(`  lv_chart_set_next_value(${variable}, ${seriesVariable}, ${value});`));
  } else if (type === "tabview") {
    lines.push(`  lv_obj_t *${variable} = lv_tabview_create(${parent});`);
  } else if (type === "calendar") {
    lines.push("#if LV_USE_CALENDAR");
    lines.push(`  lv_obj_t *${variable} = lv_calendar_create(${parent});`);
    lines.push("#else");
    lines.push(`  lv_obj_t *${variable} = lv_label_create(${parent});`);
    lines.push(`  lv_label_set_text(${variable}, "Calendar requires LV_USE_CALENDAR");`);
    lines.push("#endif");
  } else if (type === "colorpicker") {
    lines.push("#if LV_USE_COLORWHEEL");
    lines.push(`  lv_obj_t *${variable} = lv_colorwheel_create(${parent}, true);`);
    lines.push("#else");
    lines.push(`  lv_obj_t *${variable} = lv_obj_create(${parent});`);
    lines.push("#endif");
  } else if (type === "led") {
    lines.push("#if LV_USE_LED");
    lines.push(`  lv_obj_t *${variable} = lv_led_create(${parent});`);
    lines.push(prop(key, "checked") === "false" ? `  lv_led_off(${variable});` : `  lv_led_on(${variable});`);
    lines.push("#else");
    lines.push(`  lv_obj_t *${variable} = lv_obj_create(${parent});`);
    lines.push("#endif");
  } else if (type === "spinner") {
    lines.push(`  lv_obj_t *${variable} = lv_arc_create(${parent});`);
    lines.push(`  lv_arc_set_range(${variable}, 0, 100);`);
    lines.push(`  lv_arc_set_value(${variable}, 70);`);
  } else if (type === "kb") {
    lines.push("#if LV_USE_KEYBOARD");
    lines.push(`  lv_obj_t *${variable} = lv_keyboard_create(${parent});`);
    lines.push("#else");
    lines.push(`  lv_obj_t *${variable} = lv_obj_create(${parent});`);
    lines.push("#endif");
  } else if (type === "img") {
    lines.push(`  lv_obj_t *${variable} = lv_image_create(${parent});`);
    lines.push(`  /* TODO: convert image source "${cComment(prop(key, "src"))}" to an LVGL image descriptor. */`);
  } else {
    lines.push(`  lv_obj_t *${variable} = lv_obj_create(${parent});`);
    if (text) {
      const labelVariable = allocateSymbol(ctx, `${variable}_label`, "widget_label");
      lines.push(`  lv_obj_t *${labelVariable} = lv_label_create(${variable});`);
      lines.push(`  lv_label_set_text(${labelVariable}, "${cString(text)}");`);
    }
  }

  compileCommon(ctx, variable, type, key);
  compileEvent(ctx, variable, key, "onclick", "LV_EVENT_CLICKED");
  compileEvent(ctx, variable, key, "onchange", "LV_EVENT_VALUE_CHANGED");
  compileEvent(ctx, variable, key, "oninput", "LV_EVENT_VALUE_CHANGED");
  compileEvent(ctx, variable, key, "onpress", "LV_EVENT_PRESSED");
  compileEvent(ctx, variable, key, "onrelease", "LV_EVENT_RELEASED");

  const childNodes = children(key);
  if (type === "tabview") {
    const names = splitEscaped(prop(key, "tabs"));
    childNodes.filter((child) => child.type === "tab").forEach((child, index) => {
      ctx.tabLabels.set(child.instance._name, names[index] || `Tab ${index + 1}`);
    });
  }
  for (const child of childNodes) compileNode(ctx, child.type, child.instance._name, variable);
  lines.push("");
  return variable;
}

export function compileToC(dslText) {
  Zero.reset();
  parseScript(dslText, OBJECT_TYPES);

  const ctx = { lines: [], handlers: new Map(), tabLabels: new Map(), symbols: new Set(), count: 0 };
  const roots = children("zero");
  for (const root of roots) compileNode(ctx, root.type, root.instance._name, "parent");

  const handlers = [...ctx.handlers.values()].join("\n\n");
  const dynamicProperties = [...(Zero.storage ?? new Map())]
    .filter(([, node]) => node?._rawCode)
    .map(([key, node]) => `${key}: ${cComment(node._rawCode)}`);
  const dynamicNotice = dynamicProperties.length
    ? `\n * Dynamic Zero getters are intentionally not executed during export.\n${dynamicProperties.map((item) => ` * TODO dynamic property: ${item}`).join("\n")}`
    : "";
  return `/*
 * Generated by LVGL Zero Builder.
 * Target: LVGL 9.x on AVR/Arduino-class microcontrollers.
 *
 * Enable the widgets and fonts used below in lv_conf.h. Browser-only CSS
 * effects are mapped to native LVGL colors, gradients, flex layouts, borders,
 * radii, padding, opacity and text styles. Review TODO event/image comments
 * before flashing production firmware.${dynamicNotice}
 */

#include <lvgl.h>

${handlers ? `${handlers}\n\n` : ""}void zero_ui_create(lv_obj_t *parent) {
${ctx.lines.join("\n")}
}
`;
}