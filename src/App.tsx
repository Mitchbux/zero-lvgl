import {
  useState, useEffect, useRef, useCallback, useMemo, type KeyboardEvent
} from "react";
import { EXAMPLES } from "./examples.js";

// ── Renderer (lazy loaded) ────────────────────────────────────────────────────
let rendererCache: ((code: string) => string) | null = null;
async function render(code: string): Promise<string> {
  if (!rendererCache) {
    const m = await import("./lvgl-dsl.js");
    rendererCache = m.parseAndRender;
  }
  return rendererCache(code);
}

let cCompilerCache: ((code: string) => string) | null = null;
async function compileC(code: string): Promise<string> {
  if (!cCompilerCache) {
    const m = await import("./lvgl-c.js");
    cCompilerCache = m.compileToC;
  }
  return cCompilerCache(code);
}

// ── Syntax highlighter ────────────────────────────────────────────────────────
const WIDGETS = new Set([
  "screen","box","label","btn","imgbtn","checkbox","switch","slider","arc",
  "bar","dropdown","roller","textarea","list","table","chart","tabview","tab",
  "win","led","spinner","img","msgbox","kb","calendar","colorpicker","gauge",
]);
const PROPS = new Set([
  "text","value","min","max","w","h","x","y","color","textcolor","checked",
  "disabled","hidden","radius","border","bordercolor","shadow","opacity","align",
  "pad","src","options","cols","rows","data","charttype","tabs","style","note",
  "size","bold","placeholder","body","buttons","type",
]);

function highlight(raw: string): string {
  const lines = raw.split("\n");
  return lines.map(line => {
    let out = "";
    let i = 0;
    while (i < line.length) {
      if (line[i] === "#") {
        out += `<span class="h-comment">${esc(line.slice(i))}</span>`;
        i = line.length;
        continue;
      }
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') j++;
        out += `<span class="h-string">${esc(line.slice(i, j + 1))}</span>`;
        i = j + 1;
        continue;
      }
      if (line[i] === "(" || line[i] === ")") {
        out += `<span class="h-paren">${line[i]}</span>`;
        i++; continue;
      }
      if (/[a-zA-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (WIDGETS.has(word))      out += `<span class="h-widget">${word}</span>`;
        else if (PROPS.has(word))   out += `<span class="h-prop">${word}</span>`;
        else                        out += `<span class="h-text">${word}</span>`;
        i = j; continue;
      }
      if (/[0-9]/.test(line[i]) || (line[i] === "-" && /[0-9]/.test(line[i+1] ?? ""))) {
        let j = i + 1;
        while (j < line.length && /[0-9.]/.test(line[j])) j++;
        out += `<span class="h-num">${esc(line.slice(i, j))}</span>`;
        i = j; continue;
      }
      out += esc(line[i]);
      i++;
    }
    return out;
  }).join("\n");
}

function esc(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Quick-insert button data ──────────────────────────────────────────────────
type BtnGroup = { label: string; items: { label: string; insert: string; newline?: boolean }[] };

const BTN_GROUPS: BtnGroup[] = [
  {
    label: "Widgets",
    items: [
      { label: "screen",    insert: "screen (\n  color \"#0d1117\",\n  w \"360px\",\n  h \"480px\"\n)", newline: true },
      { label: "label",     insert: "label (\n  text \"\",\n  textcolor \"#ddeeff\",\n  size \"14\"\n)", newline: true },
      { label: "btn",       insert: "btn (\n  text \"\",\n  color \"#4a90e2\",\n  textcolor \"#ffffff\",\n  w \"140px\",\n  h \"38px\"\n)", newline: true },
      { label: "slider",    insert: "slider (\n  value \"50\",\n  w \"200px\",\n  color \"#4a90e2\"\n)", newline: true },
      { label: "arc",       insert: "arc (\n  value \"60\",\n  color \"#4a90e2\",\n  w \"90\"\n)", newline: true },
      { label: "bar",       insert: "bar (\n  value \"50\",\n  w \"200px\",\n  h \"12px\",\n  color \"#4a90e2\"\n)", newline: true },
      { label: "checkbox",  insert: "checkbox (\n  text \"\",\n  checked \"true\"\n)", newline: true },
      { label: "switch",    insert: "switch (\n  text \"\",\n  checked \"true\"\n)", newline: true },
      { label: "dropdown",  insert: "dropdown (\n  options \"A\\\\nB\\\\nC\",\n  w \"160px\"\n)", newline: true },
      { label: "chart",     insert: "chart (\n  data \"10,30,20,60,50\",\n  charttype \"line\",\n  color \"#4a90e2\",\n  w \"300\",\n  h \"120\"\n)", newline: true },
      { label: "tabview",   insert: "tabview (\n  tabs \"Tab 1,Tab 2\",\n  value \"0\",\n  w \"100%\"\n)", newline: true },
      { label: "win",       insert: "win (\n  text \"Window\",\n  w \"280px\"\n)", newline: true },
      { label: "led",       insert: "led (\n  color \"#50fa7b\",\n  checked \"true\",\n  w \"18\"\n)", newline: true },
      { label: "spinner",   insert: "spinner (\n  w \"40\",\n  color \"#4a90e2\"\n)", newline: true },
      { label: "list",      insert: "list (\n  options \"Item 1\\\\nItem 2\\\\nItem 3\",\n  w \"200px\"\n)", newline: true },
      { label: "img",       insert: "img (\n  src \"https://placehold.co/80x80\",\n  w \"80px\",\n  h \"80px\"\n)", newline: true },
      { label: "textarea",  insert: "textarea (\n  placeholder \"Enter text…\",\n  w \"200px\",\n  h \"60px\"\n)", newline: true },
      { label: "msgbox",    insert: "msgbox (\n  text \"Alert\",\n  body \"Message here.\",\n  buttons \"Cancel,OK\",\n  w \"260px\"\n)", newline: true },
      { label: "calendar",  insert: "calendar (\n  w \"280px\"\n)", newline: true },
      { label: "gauge",     insert: "gauge (\n  value \"65\",\n  color \"#ff79c6\",\n  w \"110\"\n)", newline: true },
    ],
  },
  {
    label: "Props",
    items: [
      { label: "text",        insert: 'text ""' },
      { label: "color",       insert: 'color "#4a90e2"' },
      { label: "textcolor",   insert: 'textcolor "#ddeeff"' },
      { label: "w",           insert: 'w "200px"' },
      { label: "h",           insert: 'h "40px"' },
      { label: "value",       insert: 'value "50"' },
      { label: "min",         insert: 'min "0"' },
      { label: "max",         insert: 'max "100"' },
      { label: "size",        insert: 'size "16"' },
      { label: "bold",        insert: 'bold "true"' },
      { label: "checked",     insert: 'checked "true"' },
      { label: "disabled",    insert: 'disabled "true"' },
      { label: "radius",      insert: 'radius "8"' },
      { label: "shadow",      insert: 'shadow "true"' },
      { label: "options",     insert: 'options "A\\\\nB\\\\nC"' },
      { label: "placeholder", insert: 'placeholder "…"' },
      { label: "src",         insert: 'src "https://placehold.co/80x80"' },
      { label: "data",        insert: 'data "10,30,20,60,50"' },
      { label: "charttype",   insert: 'charttype "line"' },
      { label: "tabs",        insert: 'tabs "Tab 1,Tab 2"' },
    ],
  },
  {
    label: "Colors",
    items: [
      { label: "#def",    insert: '"#ddeeff"' },
      { label: "#000",    insert: '"#000000"' },
      { label: "#primary",insert: '"#4a90e2"' },
      { label: "#green",  insert: '"#50fa7b"' },
      { label: "#pink",   insert: '"#ff79c6"' },
      { label: "#purple", insert: '"#bd93f9"' },
      { label: "#amber",  insert: '"#f1fa8c"' },
      { label: "#red",    insert: '"#ff5555"' },
      { label: "#cyan",   insert: '"#8be9fd"' },
      { label: "#1a1a2e", insert: '"#1a1a2e"' },
      { label: "#0d1117", insert: '"#0d1117"' },
      { label: "#16213e", insert: '"#16213e"' },
    ],
  },
  {
    label: "Values",
    items: [
      { label: "true",   insert: '"true"' },
      { label: "false",  insert: '"false"' },
      { label: "100px",  insert: '"100px"' },
      { label: "200px",  insert: '"200px"' },
      { label: "300px",  insert: '"300px"' },
      { label: "100%",   insert: '"100%"' },
      { label: "circle", insert: '"circle"' },
      { label: "line",   insert: '"line"' },
      { label: "bar",    insert: '"bar"' },
      { label: "center", insert: '"center"' },
      { label: '"0"',   insert: '"0"' },
      { label: '"50"',  insert: '"50"' },
      { label: '"100"', insert: '"100"' },
    ],
  },
  {
    label: "Keys",
    items: [
      { label: "( )",         insert: " (\n  \n)", newline: true },
      { label: "(",           insert: "(" },
      { label: ")",           insert: ")" },
      { label: '"…"',        insert: '""' },
      { label: ",",           insert: "," },
      { label: "↵",          insert: "\n", newline: true },
      { label: "⇥",          insert: "  " },
      { label: "⌫",          insert: "\x08" },
      { label: "# note",      insert: "# " },
      { label: "{ getter }",  insert: "{ return '' }" },
      { label: "{ color }",   insert: "{ var v=parseInt(Z('zero.state.val').getter('')); return v>80?'#ff5555':v>60?'#f1fa8c':'#50fa7b' }" },
      { label: "{ Z() }",     insert: "{ return Z('zero.state.val').getter('') }" },
      { label: "state ( )",   insert: "state (\n  val \"50\"\n)", newline: true },
    ],
  },
  {
    label: "Events",
    items: [
      { label: "onclick",   insert: 'onclick { lvgl.count(\'n\',1); lvgl.text(\'out\', lvgl._c[\'n\']); }', newline: true },
      { label: "onchange",  insert: 'onchange { lvgl.text(\'out\', event.target.value); }', newline: true },
      { label: "oninput",   insert: 'oninput { lvgl.text(\'out\', event.target.value); }', newline: true },
      { label: "onpress",   insert: 'onpress { lvgl.bg(\'out\', \'#ff5555\'); }', newline: true },
      { label: "onrelease", insert: 'onrelease { lvgl.bg(\'out\', \'\'); }', newline: true },
      { label: "id",        insert: 'id "my-widget"' },
      { label: "lvgl.text", insert: "lvgl.text('id', 'value')" },
      { label: "lvgl.val",  insert: "lvgl.val('id')" },
      { label: "lvgl.show", insert: "lvgl.show('id', true)" },
      { label: "lvgl.hide", insert: "lvgl.hide('id')" },
      { label: "lvgl.arc",  insert: "lvgl.arc('id', value)" },
      { label: "lvgl.bar",  insert: "lvgl.bar('id', value)" },
      { label: "lvgl.led",  insert: "lvgl.led('id', true)" },
      { label: "lvgl.bg",   insert: "lvgl.bg('id', '#color')" },
      { label: "lvgl.count",insert: "lvgl.count('k', 1)" },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
type Tab = "preview" | "edit" | "load";

export default function App() {
  const [code, setCode]         = useState(EXAMPLES[0].code);
  const [html, setHtml]         = useState("");
  const [error, setError]       = useState("");
  const [active, setActive]     = useState(EXAMPLES[0].id);
  const [tab, setTab]           = useState<Tab>("preview");
  const [btnGroup, setBtnGroup] = useState(0);
  const [copying, setCopying]   = useState(false);
  const [cStatus, setCStatus]    = useState<"" | "copying" | "copied" | "saved" | "error">("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef      = useRef<HTMLPreElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlighted = useMemo(() => highlight(code), [code]);

  const runRender = useCallback((src: string) => {
    render(src).then(out => {
      setHtml(out);
      setError("");
    }).catch(e => setError(String(e)));
  }, []);

  useEffect(() => { runRender(code); }, []);

  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop  = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleChange = (val: string) => {
    setCode(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runRender(val), 500);
  };

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setActive(ex.id);
    setCode(ex.code);
    runRender(ex.code);
    setTab("preview");
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(html).then(() => {
      setCopying(true);
      setTimeout(() => setCopying(false), 1800);
    });
  };

  const copyC = async () => {
    try {
      setCStatus("copying");
      await navigator.clipboard.writeText(await compileC(code));
      setCStatus("copied");
      setTimeout(() => setCStatus(""), 1800);
    } catch {
      setCStatus("error");
    }
  };

  const downloadC = async () => {
    try {
      const output = await compileC(code);
      const blob = new Blob([output], { type: "text/x-c;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${active || "zero-ui"}.c`;
      anchor.click();
      URL.revokeObjectURL(url);
      setCStatus("saved");
      setTimeout(() => setCStatus(""), 1800);
    } catch {
      setCStatus("error");
    }
  };

  const insertAt = (insert: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (insert === "\x08") {
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      if (s === e && s > 0) {
        const next = code.slice(0, s - 1) + code.slice(e);
        handleChange(next);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s - 1; });
      } else if (s !== e) {
        const next = code.slice(0, s) + code.slice(e);
        handleChange(next);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s; });
      }
      ta.focus();
      return;
    }
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const next = code.slice(0, s) + insert + code.slice(e);
    handleChange(next);
    const cursor = s + insert.length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = cursor;
      ta.focus();
    });
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key === "Tab") {
      ev.preventDefault();
      insertAt("  ");
    }
  };

  const group = BTN_GROUPS[btnGroup];
  const activeExample = EXAMPLES.find(e => e.id === active);

  return (
    <div className="shell">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-logo">
            <span className="logo-hex">⬡</span>
            <span className="logo-name">LVGL <em>Zero</em></span>
          </div>
          {activeExample && (
            <div className="topbar-breadcrumb">
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-name">{activeExample.label}</span>
            </div>
          )}
        </div>
        <div className="topbar-actions">
          <button className="action-btn" onClick={copyC}>
            {cStatus === "copying" ? "building…" : cStatus === "copied" ? "✓ C copied" : cStatus === "error" ? "C error" : "copy C"}
          </button>
          <button className="action-btn action-run" onClick={downloadC}>
            {cStatus === "saved" ? "✓ saved" : "download .c"}
          </button>
          {tab === "preview" && html && (
            <button className="action-btn" onClick={copyHtml}>
              {copying ? "✓ copied" : "copy html"}
            </button>
          )}
          {tab === "edit" && (
            <button className="action-btn action-run" onClick={() => { runRender(code); setTab("preview"); }}>
              run ▶
            </button>
          )}
        </div>
      </header>

      {/* ── Workspace ───────────────────────────────────────── */}
      <div className="workspace">

        {/* Desktop sidebar — examples list */}
        <aside className="examples-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">Examples</span>
            <span className="sidebar-count">{EXAMPLES.length}</span>
          </div>
          <div className="sidebar-list">
            {EXAMPLES.map(ex => (
              <button
                key={ex.id}
                className={`sidebar-item${active === ex.id ? " sidebar-item-active" : ""}`}
                onClick={() => loadExample(ex)}
              >
                <span className="sidebar-item-name">{ex.label}</span>
                <span className="sidebar-item-desc">{ex.description}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Main content area ─────────────────────────────── */}
        <main className="main">

          {/* PREVIEW TAB */}
          <div className={`tab-content tab-preview${tab === "preview" ? " tab-active" : ""}`}>
            <div className="preview-stage">
              {error
                ? <div className="err-banner">{error}</div>
                : html
                  ? <iframe
                      className="preview-iframe"
                      srcDoc={html}
                      sandbox="allow-scripts"
                      title="LVGL Preview"
                    />
                  : <div className="empty-state">
                      <span className="empty-icon">◉</span>
                      <span>Open an example or write Zero DSL</span>
                    </div>
              }
            </div>
          </div>

          {/* EDIT TAB */}
          <div className={`tab-content tab-edit${tab === "edit" ? " tab-active" : ""}`}>
            <div className="editor-header">
              <span className="editor-label">Zero DSL</span>
              <span className="editor-stats">{code.split("\n").length}L · {code.length}ch</span>
            </div>
            <div className="code-wrap">
              <pre
                ref={preRef}
                className="code-pre"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
              />
              <textarea
                ref={textareaRef}
                className="code-ta"
                value={code}
                onChange={e => handleChange(e.target.value)}
                onScroll={syncScroll}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                rows={1}
              />
            </div>

            {/* Quick-insert keyboard */}
            <div className="kbd">
              <div className="kbd-tabs">
                {BTN_GROUPS.map((g, i) => (
                  <button
                    key={g.label}
                    className={`kbd-tab${i === btnGroup ? " kbd-tab-active" : ""}`}
                    onClick={() => setBtnGroup(i)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="kbd-buttons">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    className={`kbd-btn${item.newline ? " kbd-btn-wide" : ""}`}
                    onPointerDown={e => { e.preventDefault(); insertAt(item.insert); }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LOAD TAB — mobile only */}
          <div className={`tab-content tab-load${tab === "load" ? " tab-active" : ""}`}>
            <div className="load-title">Examples</div>
            {EXAMPLES.map(ex => (
              <button
                key={ex.id}
                className={`load-item${active === ex.id ? " load-item-active" : ""}`}
                onClick={() => loadExample(ex)}
              >
                <span className="load-name">{ex.label}</span>
                <span className="load-desc">{ex.description}</span>
              </button>
            ))}
          </div>

        </main>
      </div>

      {/* ── Bottom tab bar (mobile only) ────────────────────── */}
      <nav className="tabbar">
        <button className={`tabbar-btn${tab === "preview" ? " tabbar-active" : ""}`} onClick={() => setTab("preview")}>
          <span className="tabbar-icon">◉</span>
          <span className="tabbar-label">Preview</span>
        </button>
        <button className={`tabbar-btn${tab === "edit" ? " tabbar-active" : ""}`} onClick={() => setTab("edit")}>
          <span className="tabbar-icon">✎</span>
          <span className="tabbar-label">Code</span>
        </button>
        <button className={`tabbar-btn${tab === "load" ? " tabbar-active" : ""}`} onClick={() => setTab("load")}>
          <span className="tabbar-icon">≡</span>
          <span className="tabbar-label">Load</span>
        </button>
      </nav>

      {/* ── Status strip ────────────────────────────────────── */}
      <div className="status-strip">
        <span>lv_binding_js · ZeroJS v0.0f</span>
        <span className="status-right">{code.split("\n").length}L · {code.length}ch</span>
      </div>

    </div>
  );
}
