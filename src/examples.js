/**
 * LVGL Zero DSL — Bulma design examples
 *
 * `style` accepts Bulma utility/component classes:
 *   style "columns", style "column box", style "title", style "tag is-success"
 *
 * Every example is intentionally compact, responsive, and interactive.
 */

export const EXAMPLES = [
  {
    id: "creative-dashboard",
    label: "✦ Creative Dashboard",
    description: "A polished workspace overview built from Bulma cards, columns, tags, and LVGL data widgets.",
    code: `# Creative workspace dashboard
# Bulma: columns, column, box, title, subtitle, tag
screen (
  color "linear-gradient(145deg, #0b1020 0%, #111936 52%, #080b14 100%)",
  w "390px",
  h "680px",

  box (
    style "columns",
    box (
      style "column",
      color "transparent",
      border "0",
      pad "0",
      label ( text "STUDIO / 04", style "tag is-link" ),
      label ( text "Good morning, Alex", style "title", textcolor "#ffffff", size "26", bold "true" ),
      label ( text "Your creative system is moving.", style "subtitle", textcolor "#91a0c8", size "12" )
    ),
    box (
      style "column box",
      color "rgba(72,95,199,.18)",
      border "1",
      bordercolor "rgba(120,140,255,.28)",
      pad "10",
      label ( text "FOCUS", textcolor "#8ea1ff", size "9", bold "true" ),
      label ( id "focus-score", text "84%", textcolor "#ffffff", size "24", bold "true" ),
      bar ( id "focus-bar", value "84", color "#7c8cff", w "100%", h "7px" )
    )
  ),

  label ( text "This week", textcolor "#7f8db3", size "10", bold "true" ),
  box (
    style "columns",
    box (
      style "column box",
      label ( text "12", textcolor "#ffffff", size "24", bold "true" ),
      label ( text "Projects", textcolor "#7f8db3", size "10" ),
      label ( text "+3 this week", style "tag is-success" )
    ),
    box (
      style "column box",
      label ( text "38h", textcolor "#ffffff", size "24", bold "true" ),
      label ( text "Deep work", textcolor "#7f8db3", size "10" ),
      label ( text "On target", style "tag is-primary" )
    ),
    box (
      style "column box",
      label ( text "7", textcolor "#ffffff", size "24", bold "true" ),
      label ( text "Reviews", textcolor "#7f8db3", size "10" ),
      label ( text "2 waiting", style "tag is-warning" )
    )
  ),

  box (
    style "box",
    label ( text "Momentum", style "title", textcolor "#ffffff", size "15", bold "true" ),
    chart (
      text "Last 7 sessions",
      data "28,44,39,67,58,81,84",
      charttype "line",
      color "#7c8cff",
      w "330",
      h "138",
      style "is-fullwidth"
    )
  ),

  box (
    style "columns",
    btn (
      id "refresh-dashboard",
      text "↻ Refresh",
      style "button is-link is-rounded column",
      onclick {
        var v=Math.round(68+Math.random()*28);
        lvgl.text('focus-score',v+'%');
        lvgl.bar('focus-bar',v,0,100,v>85?'#48c78e':'#7c8cff');
        lvgl.text('dashboard-status','Updated just now');
      }
    ),
    btn (
      text "+ New project",
      style "button is-dark is-rounded column",
      onclick { lvgl.text('dashboard-status','New project flow opened'); }
    )
  ),
  label ( id "dashboard-status", text "Synced 4 min ago", textcolor "#58668c", size "10", align "center", w "100%" )
)
`,
  },

  {
    id: "product-card",
    label: "🛍 Product Experience",
    description: "A conversion-focused product detail card with variants, quantity, stock state, and purchase feedback.",
    code: `# Product experience
# Bulma: box, tag, title, columns, buttons
screen (
  color "linear-gradient(155deg, #f7f3ee 0%, #ede4dc 100%)",
  w "390px",
  h "680px",

  label ( text "NORTH / OBJECTS", textcolor "#8b7567", size "10", bold "true" ),
  box (
    style "box",
    color "#fffaf6",
    border "1",
    bordercolor "#eadfd6",
    radius "18",
    shadow "true",

    box (
      color "linear-gradient(145deg,#d8c8b9,#f4ebe4)",
      border "0",
      radius "14",
      h "190px",
      label ( text "LIMITED 024", style "tag is-dark" ),
      label ( text "◯", textcolor "#8c6b57", size "108", align "center", w "100%" )
    ),

    box (
      style "columns",
      box (
        style "column",
        color "transparent",
        border "0",
        pad "0",
        label ( text "Halo Desk Lamp", style "title", textcolor "#261d18", size "23", bold "true" ),
        label ( text "Warm light, sculptural balance.", style "subtitle", textcolor "#8b7567", size "11" )
      ),
      label ( text "$128", style "tag is-warning", size "12" )
    ),

    label ( text "FINISH", textcolor "#9b8577", size "9", bold "true" ),
    dropdown (
      id "finish",
      options "Sand / Brass\\nCharcoal / Black\\nStone / Chrome",
      w "100%",
      onchange { lvgl.text('product-status','Finish: '+event.target.value); }
    ),

    box (
      style "columns",
      box (
        style "column",
        color "transparent",
        border "0",
        pad "0",
        label ( id "qty-label", text "Quantity · 1", textcolor "#59483d", size "11", bold "true" ),
        slider (
          id "qty",
          value "1",
          min "1",
          max "5",
          w "100%",
          color "#9b6f52",
          oninput {
            lvgl.text('qty-label','Quantity · '+Math.round(event.target.value));
            lvgl.text('product-status','Total: $'+(128*Math.round(event.target.value)));
          }
        )
      ),
      box (
        style "column",
        color "transparent",
        border "0",
        pad "0",
        label ( text "IN STOCK", style "tag is-success" ),
        label ( text "Ships in 24h", textcolor "#8b7567", size "10" )
      )
    ),

    btn (
      id "add-cart",
      text "Add to collection  →",
      style "button is-dark is-fullwidth is-rounded",
      h "44px",
      onclick {
        lvgl.text('product-status','✓ Added to your collection');
        lvgl.bg('add-cart','#16855b');
      }
    )
  ),
  label ( id "product-status", text "Complimentary delivery", textcolor "#8b7567", size "10", align "center", w "100%" )
)
`,
  },

  {
    id: "saas-analytics",
    label: "📈 SaaS Analytics",
    description: "A compact analytics surface with Bulma tabs, metric cards, charts, tables, and range controls.",
    code: `# SaaS analytics
# Bulma: tabs, box, columns, table, tags
screen (
  color "linear-gradient(150deg,#08111f 0%,#0b1830 60%,#07101c 100%)",
  w "390px",
  h "680px",

  box (
    style "columns",
    box (
      style "column",
      color "transparent",
      border "0",
      pad "0",
      label ( text "Northstar", style "title", textcolor "#ffffff", size "23", bold "true" ),
      label ( text "Product analytics", style "subtitle", textcolor "#6f86a8", size "11" )
    ),
    label ( text "● LIVE", style "tag is-success" )
  ),

  tabview (
    tabs "Overview,Acquisition,Revenue",
    value "0",
    w "100%",
    style "is-boxed",

    tab (
      box (
        style "columns",
        box (
          style "column box",
          label ( text "MRR", textcolor "#7186a9", size "9", bold "true" ),
          label ( id "mrr", text "$42.8k", textcolor "#ffffff", size "20", bold "true" ),
          label ( text "↑ 12.4%", style "tag is-success" )
        ),
        box (
          style "column box",
          label ( text "ACTIVE", textcolor "#7186a9", size "9", bold "true" ),
          label ( text "1,284", textcolor "#ffffff", size "20", bold "true" ),
          label ( text "↑ 86", style "tag is-link" )
        )
      ),
      chart ( text "Recurring revenue", data "18,23,22,31,36,35,43", color "#48c78e", w "330", h "150" ),
      label ( text "Goal progress", textcolor "#7186a9", size "10", bold "true" ),
      bar ( id "goal", value "72", color "#48c78e", w "100%", h "10px" )
    ),

    tab (
      label ( text "Acquisition mix", style "title", textcolor "#ffffff", size "15", bold "true" ),
      table (
        cols "Channel,Visitors,CVR",
        rows "Organic\\t12.4k\\t4.8%\\nReferral\\t8.9k\\t6.2%\\nSocial\\t6.1k\\t3.1%\\nDirect\\t4.7k\\t7.4%",
        w "100%",
        style "is-striped is-hoverable"
      ),
      label ( text "Top channel: Direct", style "tag is-primary" )
    ),

    tab (
      label ( text "Revenue quality", style "title", textcolor "#ffffff", size "15", bold "true" ),
      box (
        style "box",
        label ( text "Net retention", textcolor "#7186a9", size "10" ),
        arc ( id "retention", value "114", min "0", max "140", color "#7c8cff", w "120", text "114%" ),
        label ( text "Healthy expansion", style "tag is-success" )
      ),
      btn (
        text "Export report",
        style "button is-link is-fullwidth",
        onclick { lvgl.text('analytics-status','Report exported'); }
      )
    )
  ),
  label ( id "analytics-status", text "Updated today at 09:41", textcolor "#516887", size "10", align "center", w "100%" )
)
`,
  },

  {
    id: "project-board",
    label: "✓ Project Board",
    description: "A friendly project status board using Bulma cards, columns, progress states, and live task actions.",
    code: `# Project board
# Bulma: boxes, columns, tags, fullwidth buttons
screen (
  color "linear-gradient(160deg,#121316 0%,#1b1d23 100%)",
  w "390px",
  h "680px",

  box (
    style "columns",
    box (
      style "column",
      color "transparent",
      border "0",
      pad "0",
      label ( text "Website refresh", style "title", textcolor "#ffffff", size "22", bold "true" ),
      label ( text "Sprint 08 · Product design", style "subtitle", textcolor "#858b9c", size "11" )
    ),
    label ( text "ON TRACK", style "tag is-success" )
  ),

  box (
    style "box",
    label ( text "SPRINT PROGRESS", textcolor "#858b9c", size "9", bold "true" ),
    box (
      style "columns",
      label ( id "sprint-percent", text "68%", textcolor "#ffffff", size "28", bold "true", style "column title" ),
      label ( id "sprint-count", text "17 / 25 tasks", textcolor "#858b9c", size "10", align "right", style "column" )
    ),
    bar ( id "sprint-bar", value "68", color "#48c78e", w "100%", h "9px" )
  ),

  label ( text "Up next", textcolor "#858b9c", size "10", bold "true" ),
  box (
    style "box",
    box (
      style "columns",
      label ( text "01", style "tag is-link" ),
      box (
        style "column",
        color "transparent",
        border "0",
        pad "0",
        label ( text "Finalize landing page", textcolor "#ffffff", size "13", bold "true" ),
        label ( text "Today · Design review", textcolor "#73798a", size "10" )
      ),
      checkbox (
        id "task-one",
        text "",
        checked "false",
        onchange {
          lvgl.text('board-status',event.target.checked?'Task completed':'Task reopened');
          lvgl.bar('sprint-bar',event.target.checked?72:68,0,100,'#48c78e');
          lvgl.text('sprint-percent',event.target.checked?'72%':'68%');
          lvgl.text('sprint-count',event.target.checked?'18 / 25 tasks':'17 / 25 tasks');
        }
      )
    )
  ),

  box (
    style "box",
    box (
      style "columns",
      label ( text "02", style "tag is-warning" ),
      box (
        style "column",
        color "transparent",
        border "0",
        pad "0",
        label ( text "Prototype onboarding", textcolor "#ffffff", size "13", bold "true" ),
        label ( text "Tomorrow · Interaction", textcolor "#73798a", size "10" )
      ),
      label ( text "2h", style "tag is-dark" )
    )
  ),

  box (
    style "box",
    box (
      style "columns",
      label ( text "03", style "tag is-primary" ),
      box (
        style "column",
        color "transparent",
        border "0",
        pad "0",
        label ( text "QA component states", textcolor "#ffffff", size "13", bold "true" ),
        label ( text "Friday · Engineering", textcolor "#73798a", size "10" )
      ),
      label ( text "5h", style "tag is-dark" )
    )
  ),

  btn (
    text "+ Add task",
    style "button is-link is-fullwidth is-rounded",
    onclick { lvgl.text('board-status','New task composer opened'); }
  ),
  label ( id "board-status", text "3 tasks due this week", textcolor "#73798a", size "10", align "center", w "100%" )
)
`,
  },

  {
    id: "smart-home",
    label: "⌂ Smart Home",
    description: "A room controller with equal-width Bulma tabs, live switches, temperature, scenes, and device states.",
    code: `# Smart home controller
# Bulma: tabs, columns, box, notification, buttons
screen (
  color "radial-gradient(circle at 80% 0%,#183950 0%,#0b1722 50%,#071019 100%)",
  w "390px",
  h "680px",

  box (
    style "columns",
    box (
      style "column",
      color "transparent",
      border "0",
      pad "0",
      label ( text "Evening, Sam", style "title", textcolor "#ffffff", size "22", bold "true" ),
      label ( id "home-status", text "6 devices online", style "subtitle", textcolor "#7192a8", size "11" )
    ),
    label ( text "21°C", style "tag is-link" )
  ),

  tabview (
    tabs "Living,Bedroom,Kitchen",
    value "0",
    w "100%",

    tab (
      box (
        style "notification is-primary",
        label ( text "Living room", textcolor "#ffffff", size "15", bold "true" ),
        label ( text "Comfort scene · 3 devices", textcolor "#d8e9ff", size "10" ),
        box (
          style "columns",
          btn (
            text "Relax",
            style "button is-light is-small column",
            onclick { lvgl.text('home-status','Relax scene activated'); lvgl.led('living-led',true,'#ffe08a'); }
          ),
          btn (
            text "Movie",
            style "button is-dark is-small column",
            onclick { lvgl.text('home-status','Movie scene activated'); lvgl.led('living-led',true,'#7c8cff'); }
          )
        )
      ),
      box (
        style "box",
        box (
          style "columns",
          label ( text "Ambient lights", textcolor "#ffffff", size "12", bold "true", style "column" ),
          led ( id "living-led", color "#ffe08a", checked "true", w "12" )
        ),
        switch (
          text "Power",
          checked "true",
          onchange { lvgl.led('living-led',event.target.checked,'#ffe08a'); lvgl.text('home-status','Living lights '+(event.target.checked?'on':'off')); }
        ),
        label ( id "living-brightness", text "Brightness · 72%", textcolor "#7192a8", size "10" ),
        slider (
          value "72",
          color "#ffe08a",
          w "100%",
          oninput { lvgl.text('living-brightness','Brightness · '+Math.round(event.target.value)+'%'); }
        )
      )
    ),

    tab (
      box (
        style "notification is-link",
        label ( text "Bedroom", textcolor "#ffffff", size "15", bold "true" ),
        label ( text "Sleep scene ready", textcolor "#e0e4ff", size "10" )
      ),
      box (
        style "box",
        switch (
          text "Bedside lamps",
          checked "false",
          onchange { lvgl.text('home-status','Bedside lamps '+(event.target.checked?'on':'off')); }
        ),
        switch (
          text "Air purifier",
          checked "true",
          onchange { lvgl.text('home-status','Air purifier '+(event.target.checked?'on':'off')); }
        ),
        label ( id "bed-temp", text "Temperature · 19°C", textcolor "#7192a8", size "10" ),
        slider (
          value "30",
          color "#7c8cff",
          w "100%",
          oninput { lvgl.text('bed-temp','Temperature · '+Math.round(16+event.target.value*.1)+'°C'); }
        )
      )
    ),

    tab (
      box (
        style "notification is-success",
        label ( text "Kitchen", textcolor "#ffffff", size "15", bold "true" ),
        label ( text "Everything is secure", textcolor "#ddfff1", size "10" )
      ),
      box (
        style "box",
        switch (
          text "Counter lights",
          checked "true",
          onchange { lvgl.text('home-status','Counter lights '+(event.target.checked?'on':'off')); }
        ),
        switch (
          text "Coffee schedule",
          checked "true",
          onchange { lvgl.text('home-status',event.target.checked?'Coffee set for 07:00':'Coffee schedule paused'); }
        ),
        label ( text "Fridge", textcolor "#7192a8", size "10" ),
        bar ( value "83", color "#48c78e", w "100%", h "9px" )
      )
    )
  )
)
`,
  },

  {
    id: "focus-timer",
    label: "◷ Focus Timer",
    description: "A calm productivity timer with strong hierarchy, session controls, task list, and focus feedback.",
    code: `# Focus timer
# Bulma: title, subtitle, box, tags, rounded buttons
screen (
  color "radial-gradient(circle at 50% 25%,#2c214b 0%,#141126 48%,#090812 100%)",
  w "390px",
  h "680px",

  label ( text "DEEP WORK", style "tag is-link" ),
  label ( text "Make space for one thing.", style "title", textcolor "#ffffff", size "24", bold "true" ),
  label ( text "Notifications are muted until the session ends.", style "subtitle", textcolor "#8e84ad", size "11" ),

  box (
    style "box",
    color "rgba(30,24,55,.82)",
    border "1",
    bordercolor "rgba(150,125,220,.22)",
    label ( id "timer-mode", text "FOCUS SESSION", textcolor "#9f8be0", size "9", bold "true", align "center", w "100%" ),
    arc ( id "timer-arc", value "75", color "#9b7cff", w "190", text "18:45" ),
    label ( id "timer-copy", text "18 minutes remaining", textcolor "#8e84ad", size "10", align "center", w "100%" ),
    box (
      style "columns",
      btn (
        id "timer-toggle",
        text "Pause",
        style "button is-link is-rounded column",
        onclick {
          lvgl.count('paused',1);
          var paused=lvgl._c['paused']%2===1;
          lvgl.text('timer-toggle',paused?'Resume':'Pause');
          lvgl.text('timer-copy',paused?'Session paused':'18 minutes remaining');
        }
      ),
      btn (
        text "Reset",
        style "button is-dark is-rounded column",
        onclick {
          lvgl.arc('timer-arc',100,0,100,'#9b7cff');
          lvgl.text('timer-copy','25 minutes remaining');
          lvgl.text('timer-toggle','Start');
        }
      )
    )
  ),

  label ( text "SESSION TASKS", textcolor "#6f668a", size "9", bold "true" ),
  box (
    style "box",
    checkbox (
      text "Polish mobile navigation",
      checked "true",
      onchange { lvgl.text('focus-status',event.target.checked?'Task restored':'Task reopened'); }
    ),
    checkbox (
      text "Review empty states",
      checked "false",
      onchange { lvgl.text('focus-status',event.target.checked?'Nice — task completed':'Task reopened'); }
    ),
    checkbox (
      text "Document spacing tokens",
      checked "false",
      onchange { lvgl.text('focus-status',event.target.checked?'Nice — task completed':'Task reopened'); }
    )
  ),

  box (
    style "columns",
    label ( text "3 sessions", style "tag is-primary column" ),
    label ( text "72 min focused", style "tag is-success column" )
  ),
  label ( id "focus-status", text "Protect your attention.", textcolor "#6f668a", size "10", align "center", w "100%" )
)
`,
  },

  {
    id: "account-settings",
    label: "⚙ Account Settings",
    description: "A production-style settings form with Bulma tabs, fields, switches, security state, and save feedback.",
    code: `# Account settings
# Bulma: tabs, boxes, textarea, tags, buttons
screen (
  color "linear-gradient(155deg,#f5f7fb 0%,#e9eef8 100%)",
  w "390px",
  h "680px",

  box (
    style "columns",
    box (
      style "column",
      color "transparent",
      border "0",
      pad "0",
      label ( text "Settings", style "title", textcolor "#1f2940", size "24", bold "true" ),
      label ( id "settings-status", text "Manage your workspace preferences", style "subtitle", textcolor "#71809b", size "10" )
    ),
    label ( text "PRO", style "tag is-link" )
  ),

  tabview (
    tabs "Profile,Alerts,Security",
    value "0",
    w "100%",

    tab (
      box (
        style "box",
        color "#ffffff",
        label ( text "Display name", textcolor "#56637a", size "10", bold "true" ),
        textarea (
          id "display-name",
          text "Alex Morgan",
          placeholder "Your display name",
          w "100%",
          h "46px",
          oninput { lvgl.text('settings-status','Unsaved profile changes'); }
        ),
        label ( text "Role", textcolor "#56637a", size "10", bold "true" ),
        dropdown (
          options "Product Designer\\nDesign Engineer\\nProduct Manager",
          w "100%",
          onchange { lvgl.text('settings-status','Role updated to '+event.target.value); }
        ),
        label ( text "Bio", textcolor "#56637a", size "10", bold "true" ),
        textarea (
          placeholder "A short introduction…",
          w "100%",
          h "76px",
          oninput { lvgl.text('settings-status','Unsaved profile changes'); }
        ),
        btn (
          text "Save profile",
          style "button is-link is-fullwidth",
          onclick { lvgl.text('settings-status','✓ Profile saved'); }
        )
      )
    ),

    tab (
      box (
        style "box",
        color "#ffffff",
        switch (
          text "Product updates",
          checked "true",
          onchange { lvgl.text('settings-status','Product updates '+(event.target.checked?'enabled':'disabled')); }
        ),
        switch (
          text "Weekly summary",
          checked "true",
          onchange { lvgl.text('settings-status','Weekly summary '+(event.target.checked?'enabled':'disabled')); }
        ),
        switch (
          text "Team mentions",
          checked "false",
          onchange { lvgl.text('settings-status','Team mentions '+(event.target.checked?'enabled':'disabled')); }
        ),
        label ( text "Quiet hours", textcolor "#56637a", size "10", bold "true" ),
        dropdown (
          options "22:00 – 07:00\\n20:00 – 08:00\\nDisabled",
          w "100%",
          onchange { lvgl.text('settings-status','Quiet hours: '+event.target.value); }
        )
      )
    ),

    tab (
      box (
        style "notification is-success",
        label ( text "Account protected", textcolor "#ffffff", size "14", bold "true" ),
        label ( text "Two-factor authentication is active.", textcolor "#ddfff1", size "10" )
      ),
      box (
        style "box",
        color "#ffffff",
        label ( text "Last sign-in", textcolor "#56637a", size "10", bold "true" ),
        label ( text "Paris, France · Today at 09:41", textcolor "#1f2940", size "12" ),
        checkbox (
          text "Require verification on new devices",
          checked "true",
          onchange { lvgl.text('settings-status','Security preference updated'); }
        ),
        btn (
          text "Review active sessions",
          style "button is-dark is-fullwidth",
          onclick { lvgl.text('settings-status','Active sessions opened'); }
        )
      )
    )
  )
)
`,
  },

  {
    id: "calendar-color",
    label: "◈ Calendar Color Studio",
    description: "Select a calendar day, then use the color picker to paint its highlight.",
    code: `# Calendar color studio
# Native calendar selection and color-wheel binding; no event script is needed.
screen (
  color "linear-gradient(145deg,#111827 0%,#1f2937 58%,#0f172a 100%)",
  w "390px",
  h "680px",

  label ( text "PLANNER / COLOR STUDIO", style "tag is-link" ),
  label ( text "Paint your schedule", style "title", textcolor "#ffffff", size "24", bold "true" ),
  label ( text "Choose a day and give it a color.", style "subtitle", textcolor "#a8b5cf", size "11" ),

  box (
    style "box",
    label ( text "SCHEDULE", textcolor "#8ea1c4", size "9", bold "true" ),
    calendar (
      id "agenda-calendar",
      w "100%",
      datelabel "selected-day",
      selectedcolor "#ff6b9d"
    )
  ),

  box (
    style "columns",
    box (
      style "column box",
      label ( text "DAY COLOR", textcolor "#8ea1c4", size "9", bold "true" ),
      colorpicker (
        id "agenda-color",
        color "#ff6b9d",
        w "112",
        bindcalendar "agenda-calendar"
      ),
      label ( text "Native LVGL color wheel", textcolor "#ffffff", size "11", bold "true", align "center", w "100%" )
    ),
    box (
      style "column box",
      label ( text "SELECTED DAY", textcolor "#8ea1c4", size "9", bold "true" ),
      label ( id "selected-day", text "Select a date", textcolor "#ffffff", size "16", bold "true" ),
      label ( text "The highlight follows your chosen color.", textcolor "#a8b5cf", size "10" )
    )
  )
)
`,
  },

  {
    id: "bulma-lab",
    label: "◆ Bulma + LVGL Lab",
    description: "A compact reference showing how Bulma utilities compose with interactive LVGL widgets.",
    code: `# Bulma + LVGL component lab
# Try style classes on labels, objects, buttons, forms and tables.
screen (
  color "linear-gradient(145deg,#10111a,#17192a)",
  w "390px",
  h "680px",

  label ( text "DESIGN SYSTEM", style "tag is-primary" ),
  label ( text "Bulma × LVGL", style "title", textcolor "#ffffff", size "25", bold "true" ),
  label ( text "Web layout primitives. Embedded UI behavior.", style "subtitle", textcolor "#8b91ad", size "11" ),

  box (
    style "columns",
    box (
      style "column notification is-primary",
      label ( text "Primary", textcolor "#ffffff", size "13", bold "true" ),
      label ( text "Action", textcolor "#dce8ff", size "10" )
    ),
    box (
      style "column notification is-success",
      label ( text "Success", textcolor "#ffffff", size "13", bold "true" ),
      label ( text "Positive", textcolor "#e1fff3", size "10" )
    ),
    box (
      style "column notification is-danger",
      label ( text "Danger", textcolor "#ffffff", size "13", bold "true" ),
      label ( text "Critical", textcolor "#ffe5eb", size "10" )
    )
  ),

  box (
    style "box",
    label ( text "Buttons", textcolor "#8b91ad", size "9", bold "true" ),
    box (
      style "columns",
      btn (
        text "Primary",
        style "button is-primary is-small column",
        onclick { lvgl.text('lab-status','Primary action'); }
      ),
      btn (
        text "Success",
        style "button is-success is-small column",
        onclick { lvgl.text('lab-status','Success action'); }
      ),
      btn (
        text "Danger",
        style "button is-danger is-small column",
        onclick { lvgl.text('lab-status','Danger action'); }
      )
    ),
    label ( text "Controls", textcolor "#8b91ad", size "9", bold "true" ),
    switch (
      text "Live preview",
      checked "true",
      onchange { lvgl.text('lab-status','Live preview '+(event.target.checked?'enabled':'disabled')); }
    ),
    slider (
      value "64",
      color "#485fc7",
      w "100%",
      oninput { lvgl.text('lab-status','Scale '+Math.round(event.target.value)+'%'); }
    ),
    dropdown (
      options "Compact density\\nComfortable density\\nSpacious density",
      w "100%",
      onchange { lvgl.text('lab-status',event.target.value); }
    )
  ),

  box (
    style "box",
    label ( text "Data table", textcolor "#8b91ad", size "9", bold "true" ),
    table (
      cols "Token,Value,Use",
      rows "primary\\t#485fc7\\tActions\\nsuccess\\t#48c78e\\tStatus\\nradius\\t12px\\tCards",
      w "100%",
      style "is-striped is-hoverable"
    )
  ),

  box (
    style "columns",
    label ( text "is-primary", style "tag is-primary column" ),
    label ( text "is-success", style "tag is-success column" ),
    label ( text "is-warning", style "tag is-warning column" )
  ),
  label ( id "lab-status", text "All components are interactive", textcolor "#68708c", size "10", align "center", w "100%" )
)
`,
  },
];