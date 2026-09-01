# LVGL Zero Builder

A browser-based playground for designing LVGL-inspired interfaces with the Zero DSL. Pick an official-demo-style example, edit the DSL, and see the rendered screen update live.

## Features

- Eight polished, interactive examples built with the Zero DSL
- LVGL-inspired widgets including buttons, tabs, sliders, charts, tables, forms, and more
- Live preview with responsive desktop and mobile layouts
- Syntax highlighting and quick-insert controls for learning the DSL
- Bulma-compatible classes inside generated previews

## Run locally

Requirements: Node.js 20+ and pnpm (or npm).

    pnpm install
    pnpm dev

Use pnpm build for a production build and pnpm typecheck to check TypeScript.

## Project structure

- src/App.tsx — builder workspace and editor UI
- src/examples.js — the example gallery and Zero DSL programs
- src/lvgl-dsl.js — Zero DSL parser and HTML preview renderer
- src/zero-runtime.js — reactive runtime used by the renderer
- src/lvgl-widget.css — LVGL widget styles and Bulma compatibility bridge
- src/index.css — builder shell styles
