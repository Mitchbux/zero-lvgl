# LVGL Zero Builder

Design LVGL-inspired interfaces with a compact, readable Zero DSL. The builder gives you a live browser preview, polished interactive examples, Bulma-compatible styling, and a native LVGL 9.x C export for AVR and Arduino-class devices.

**Live builder:** use the app preview in this repository  
**Source repository:** [github.com/Mitchbux/zero-lvgl](https://github.com/Mitchbux/zero-lvgl)

## What it does

- Write Zero DSL in the editor and see the UI update live.
- Start from nine polished examples covering dashboards, products, analytics, project boards, smart-home controls, timers, settings, calendar color selection, and Bulma composition.
- Preview 27 LVGL-style widgets in a responsive device frame.
- Compose widgets with nested blocks while preserving declaration order.
- Apply direct visual properties, CSS gradients, and Bulma utility/component classes.
- Add interactive browser-preview events with the `on*` keywords and the built-in `lvgl` helper API.
- Declare calendar/color-wheel behavior without JavaScript using `datelabel`, `selectedcolor`, and `bindcalendar`.
- Export the current design as a standalone HTML file with inline CSS and runtime.
- Export the current design as LVGL 9.x C, ready to review and adapt for AVR/Arduino firmware.
- Copy or download both HTML and C output directly from the toolbar.
- Use the mobile tab bar and desktop sidebar interchangeably.
- Use the editor quick-insert keyboard for widgets, properties, colors, values, syntax keys, and events.

## Quick start

```bash
pnpm install
pnpm dev
```

The project is a Vite app. For a production build:

```bash
pnpm run typecheck
pnpm run build
```

## Zero DSL at a glance

Widgets are named blocks. Properties are written as child values, separated by commas. Strings may use single or double quotes.

```zero
# A small LVGL-style screen
screen (
  color "linear-gradient(145deg,#111827 0%,#1f2937 100%)",
  w "360px",
  h "520px",

  label (
    id "title",
    text "Device status",
    textcolor "#ffffff",
    size "24",
    bold "true"
  ),

  box (
    style "box",
    label ( text "Temperature", textcolor "#a8b5cf" ),
    bar ( value "72", min "0", max "100", color "#48c78e", w "100%" ),
    btn ( id "refresh", text "Refresh", style "button is-link" )
  )
)
```

### Syntax rules

| Syntax | Meaning |
| --- | --- |
| `widget ( ... )` | Create a widget and nest its children. |
| `property "value"` | Set a scalar property on the current widget. |
| `# comment` | Ignore the rest of the line. |
| `,` | Move back to the current block and begin the next property or child. |
| `"text"` / `'text'` | Quoted string value. Newlines and tabs can be represented as `\n` and `\t` in option/data properties. |
| `{ expression }` | Define a dynamic Zero getter. It runs in the browser preview and is annotated rather than executed during C export. |
| `state ( ... )` | Define a Zero data object that can be read by dynamic getters. |

`box` is the generic container keyword. Older `obj` examples are not part of the current widget vocabulary.

## Complete widget reference

Every widget below is recognized by the parser and available in the preview. Child widgets can be placed inside container widgets such as `screen`, `box`, `win`, `tabview`, and `tab`.

| Widget | Purpose | Useful properties |
| --- | --- | --- |
| `screen` | Root display surface/device frame. | `color`, `w`, `h`, `text` |
| `box` | Generic flex container or panel. | `color`, `w`, `h`, `radius`, `border`, `pad`, `style` |
| `label` | Text label. | `text`, `textcolor`, `size`, `bold`, `align` |
| `btn` | Push button. | `text`, `color`, `textcolor`, `w`, `h`, `radius`, `disabled` |
| `imgbtn` | Image-button-shaped button preview. | `text`, `src`, `color`, `w`, `h` |
| `checkbox` | Checkbox input. | `text`, `checked`, `disabled` |
| `switch` | On/off switch. | `text`, `checked`, `disabled` |
| `slider` | Horizontal range input. | `value`, `min`, `max`, `w`, `color`, `disabled` |
| `arc` | Circular progress/value indicator. | `value`, `min`, `max`, `color`, `w`, `text` |
| `bar` | Linear progress bar. | `value`, `min`, `max`, `w`, `h`, `color` |
| `dropdown` | Select/dropdown input. | `options`, `value`, `w`, `disabled` |
| `roller` | Scroll-wheel style option picker. | `options`, `value`, `w` |
| `textarea` | Multi-line text input. | `text`, `placeholder`, `w`, `h`, `disabled` |
| `list` | Vertical list of items. | `options`, `w`, `style` |
| `table` | Data table. | `cols`, `rows`, `w`, `style` |
| `chart` | SVG line, bar, or scatter-style chart preview. | `data`, `charttype`, `color`, `w`, `h`, `text` |
| `tabview` | Tabbed view container with automatic navigation. | `tabs`, `value`, `w`, `style` |
| `tab` | Tab content block, normally nested in `tabview`. | child widgets |
| `win` | Titled window/panel with a body. | `text`, `w`, `h` |
| `led` | LED indicator. | `color`, `checked`, `w` |
| `spinner` | Loading spinner. | `color`, `w` |
| `img` | Image element. | `src`, `text`, `w`, `h`, `radius` |
| `msgbox` | Message dialog preview. | `text`, `body`, `buttons`, `w` |
| `kb` | On-screen keyboard layout. | `w` |
| `calendar` | Current-month date picker. | `w`, `datelabel`, `selectedcolor` |
| `colorpicker` | HSV color-wheel preview and color input. | `color`, `w`, `bindcalendar` |
| `gauge` | Speedometer-style value indicator. | `value`, `min`, `max`, `color`, `w`, `text` |

### Widget examples

```zero
chart (
  data "12,34,28,65,52,80",
  charttype "line",
  color "#7c8cff",
  w "300",
  h "140",
  text "Weekly activity"
)

tabview (
  tabs "Overview,Details",
  value "0",
  w "100%",
  tab (
    label ( text "Overview content" )
  ),
  tab (
    label ( text "Details content" )
  )
)
```

## Complete property reference

Properties are strings in the DSL; the renderer converts numeric, boolean, dimension, color, and list-like values where appropriate.

| Property | Meaning and accepted values |
| --- | --- |
| `id` | Stable user-facing identifier used by events, dynamic getters, and bindings. |
| `text` | Primary label, button, window, chart, image alt text, or gauge text. |
| `value` | Numeric value or selected index. Sliders, bars, arcs, gauges, dropdowns, rollers, and tabviews use it. |
| `min` | Numeric range minimum. |
| `max` | Numeric range maximum. |
| `w` | Width such as `200px`, `300`, `100%`, or `auto`. |
| `h` | Height such as `40px`, `120`, `100%`, or `auto`. |
| `x` | Horizontal offset in pixels for absolute-positioned content. |
| `y` | Vertical offset in pixels for absolute-positioned content. |
| `color` | Background, indicator, accent, or LED color. CSS colors and gradients are accepted in the browser preview. |
| `textcolor` | Text color. |
| `checked` | Boolean string `true` or `false` for checkboxes, switches, and LED state. |
| `disabled` | Boolean string `true` or `false`; disables interactive controls. |
| `hidden` | Boolean string `true` or `false`; hides the widget. |
| `radius` | Border radius in pixels or `circle`. |
| `border` | Border width in pixels. |
| `bordercolor` | Border color. |
| `shadow` | Boolean string `true` or `false`; adds a soft shadow. |
| `opacity` | Opacity from `0` to `255`, matching the LVGL-style range. |
| `align` | `left`, `center`, `right`, `top`, `bottom`, or LVGL-style positional names such as `top_left`. |
| `pad` | Uniform padding in pixels. |
| `size` | Text size in pixels. C export maps it to the nearest enabled Montserrat LVGL font size. |
| `bold` | Boolean string `true` or `false`. Browser preview uses bold text; C output adds a note to assign a bold `lv_font_t`. |
| `src` | Image source URL for `img` and `imgbtn`. C export leaves a descriptor conversion note. |
| `placeholder` | Placeholder text for `textarea`. |
| `options` | Newline-separated options for `dropdown`, `roller`, or `list`. |
| `cols` | Comma-separated table column headings. |
| `rows` | Newline-separated table rows with tab-separated cells. |
| `data` | Comma-separated numeric chart values. |
| `charttype` | Chart style: `line`, `bar`, or `scatter` in the DSL. |
| `tabs` | Comma-separated tab header labels for `tabview`. |
| `body` | Message body text for `msgbox`. |
| `buttons` | Comma-separated button labels for `msgbox`. |
| `style` | Space-separated CSS/Bulma classes. Safe alphanumeric, `_`, and `-` class names are retained. |
| `note` | Developer-facing note property; ignored by the renderer. |
| `datelabel` | Calendar binding target: the `id` of a label that receives the selected date as `YYYY-MM-DD`. |
| `selectedcolor` | Initial selected-day color for `calendar`. |
| `bindcalendar` | Calendar `id` controlled by a `colorpicker`. The chosen color is applied to the selected day. |

### Dimensions and colors

The browser preview accepts CSS color strings, including:

```zero
color "linear-gradient(90deg,#111827 0%,#7c3aed 50%,#ec4899 100%)"
```

The native exporter reduces a two-stop gradient to LVGL's native two-color gradient. Browser-only effects should always be reviewed before flashing firmware.

## Events and interactive behavior

The browser preview supports five event keywords. Put an event on the widget that should receive it:

| Event | Preview DOM event | Typical widgets |
| --- | --- | --- |
| `onclick` | `click` | `btn`, `label`, `led`, `calendar` |
| `onchange` | `change` / value change | `checkbox`, `switch`, `dropdown`, `slider`, `textarea`, `colorpicker` |
| `oninput` | `input` | `slider`, `textarea`, `colorpicker` |
| `onpress` | `mousedown` / pressed | `btn` |
| `onrelease` | `mouseup` / released | `btn` |

Event bodies are JavaScript in the browser preview:

```zero
btn (
  id "refresh",
  text "Refresh",
  onclick {
    lvgl.text('status', 'Updated');
  }
)
label ( id "status", text "Waiting" )
```

The built-in browser helper is exposed as `lvgl`:

| Helper | Behavior |
| --- | --- |
| `lvgl.get(id)` | Return the rendered element for an `id`. |
| `lvgl.text(id, value)` | Replace an element's text. |
| `lvgl.html(id, value)` | Replace an element's HTML. |
| `lvgl.bg(id, value)` | Set an element's background. |
| `lvgl.color(id, value)` | Set an element's text color. |
| `lvgl.colorpicker(id, value)` | Update a color-picker cursor and input. |
| `lvgl.calendarDayColor(id, value)` | Paint the currently selected calendar day. |
| `lvgl.val(id[, value])` | Read or set a control value. |
| `lvgl.show(id, visible)` | Show or hide an element. |
| `lvgl.hide(id)` | Hide an element. |
| `lvgl.arc(id, value[, min, max, color])` | Update an arc value and optional color. |
| `lvgl.bar(id, value[, min, max, color])` | Update a bar value and optional color. |
| `lvgl.led(id, on[, color])` | Turn an LED on/off and optionally recolor it. |
| `lvgl.tab(tabview, index)` | Activate a tab by index. `tabview` may be an element or an `id`; if omitted, the first tabview is used. |
| `lvgl.count(key[, delta])` | Increment and return a small browser-side counter. |

The browser runtime also exposes `lvgl.state` for arbitrary state values and `lvgl._c` for the counter values maintained by `lvgl.count()`.

`event.target` and `event.currentTarget` are available inside event bodies. Event code is intentionally browser-specific. During C export, ordinary event bodies become compiling callback stubs with TODO comments so they can be translated safely for a target firmware.

### Declarative calendar and color-wheel binding

Calendar selection and color assignment are built into the renderer and C exporter. No event body is needed:

```zero
calendar (
  id "agenda-calendar",
  datelabel "selected-day",
  selectedcolor "#ff6b9d"
)

colorpicker (
  id "agenda-color",
  color "#ff6b9d",
  bindcalendar "agenda-calendar"
)

label ( id "selected-day", text "Select a date" )
```

In the generated LVGL C, the date callback uses `lv_calendar_get_pressed_date()`, while the color callback reads `lv_colorwheel_get_rgb()` and applies the result to `LV_PART_ITEMS | LV_STATE_CHECKED`.

## Bulma and LVGL styling bridge

The `style` property accepts safe, space-separated Bulma class names alongside the direct properties above. The browser includes a small LVGL/CSS bridge for common layout and component classes:

| Class | Effect |
| --- | --- |
| `columns` | Horizontal flex layout. |
| `is-multiline` | Wrapping horizontal flex layout. |
| `column` | Flexible equal-width column. |
| `box` | Dark panel with border, radius, and padding. |
| `notification` | Rounded padded notification surface. |
| `tag` | Pill-shaped label treatment. |
| `title` | Larger title styling. |
| `subtitle` | Muted subtitle styling. |
| `is-rounded` | Circular/pill radius. |
| `is-fullwidth` | Full available width. |
| `is-small` | Compact padding. |
| `is-striped` | Striped table treatment. |
| `is-primary` | Primary accent color. |
| `is-link` | Link blue accent. |
| `is-success` | Success green accent. |
| `is-warning` | Warning yellow accent and dark text. |
| `is-danger` | Danger red accent. |
| `is-dark` | Dark accent. |

Explicit DSL properties win over Bulma defaults. The C exporter maps the same supported classes to native LVGL color, flex, border, radius, padding, opacity, font, and text-style calls.

## Exporting

### Standalone HTML

Select **download HTML** from the Preview tab. The downloaded document includes:

- The rendered widget markup.
- Inline widget CSS.
- The browser interaction runtime.
- Responsive device-frame fitting.

It has no Bulma stylesheet CDN dependency, so it can be opened directly with `file://`.

### Native LVGL C

Select **copy C** or **download .c** from the toolbar. The exporter targets LVGL 9.x and generates:

- LVGL widget constructors and nested child creation.
- Native dimensions, colors, gradients, text styles, fonts, borders, radii, padding, opacity, and flex layout.
- Bulma class translations.
- Range values and chart/table/list content.
- Feature guards such as `LV_USE_CALENDAR`, `LV_USE_COLORWHEEL`, `LV_USE_KEYBOARD`, and `LV_USE_LED`.
- Safe, collision-resistant C identifiers that avoid C keywords.
- Native calendar date and color-wheel binding callbacks.

The output includes comments for browser-only or target-specific work such as image descriptors, bold font selection, dynamic getters, and ordinary JavaScript event bodies. Review those comments before production firmware.

## Builder interface

### Desktop

- **Examples sidebar:** switch among the nine included examples.
- **Preview tab:** inspect the responsive rendered UI.
- **Code tab:** edit Zero DSL with line/character counts, synchronized syntax highlighting, and Tab-to-indent behavior.
- **Toolbar:** copy/download C, download/copy standalone HTML, and run the current source.
- **Quick-insert keyboard:** switch among `Widgets`, `Props`, `Colors`, `Values`, `Keys`, and `Events`.

### Mobile

The sidebar becomes the **Load** tab, and the bottom navigation switches between **Preview**, **Code**, and **Load** without losing the current source.

### Error handling

Parse errors are shown in the preview area. Rendering is debounced while editing, and the run action lets you explicitly render the current draft.

## Included examples

| Example | Demonstrates |
| --- | --- |
| Creative Dashboard | Cards, columns, tags, metrics, chart-like data, and live actions. |
| Product Card | Product detail layout, variants, quantity controls, stock state, and purchase feedback. |
| SaaS Analytics | Tabs, metric cards, charts, tables, and range controls. |
| Project Board | Cards, columns, progress states, and task actions. |
| Smart Home | Tabs, switches, temperature, scenes, LEDs, and device states. |
| Focus Timer | Timer hierarchy, arc progress, task list, and focus feedback. |
| Account Settings | Settings form, tabs, fields, switches, security state, and save feedback. |
| Calendar Color Studio | Native-style date selection, date label binding, and selected-day color assignment. |
| Bulma + LVGL Lab | Direct comparison of Bulma utilities and interactive LVGL-style widgets. |

## Implementation notes

- The Zero runtime parses object blocks, scalar properties, quoted values, comments, arrays, dynamic getters, and nested data.
- The HTML renderer is self-contained and uses the same widget vocabulary as the C compiler.
- C export does not execute dynamic getter code. It records the affected property in the generated header instead.
- `imgbtn` currently uses the button-style browser preview; image assets require target-specific LVGL descriptors in C.
- `gauge` and `spinner` are rendered with the closest available native LVGL primitive in the C output.

## License

This repository currently does not declare a license. Add one before distributing the project or generated assets publicly.