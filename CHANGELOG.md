# Changelog

## 1.0.0 — 2026-08-14

First stable release. All features consolidated from the beta series (beta.1 tested publicly for over a month, beta.2–4 iterated with community feedback).

### Features

- **Ctrl/Cmd + Scroll** zoom, with per-tab memory (per-note mode optional)
- **Pinch-to-zoom** on precision touchpads — no need to click the note first
- **Pop-out window support** — zoom works in notes opened in separate windows
- **Zoom feedback bubble** — a % indicator appears at your cursor while zooming
- **Preset cycling & double-click slider** on the status bar indicator
- **Reset all zoom** — settings button and bindable command
- **Auto language detection** on first launch; language switches take effect immediately, no restart needed
- **5 interface languages** — English, 简体中文, 繁體中文, 日本語, 한국어

### Fixes & performance

- Zoom now targets the window under the cursor in multi-window setups
- Reading mode zoom fixed — each view mode zooms its own element
- No visual flash when switching between edit and reading modes
- Element cache + pinch throttling keep long notes smooth

### Declarations

- Desktop-only for now (mobile not supported yet)
- `minAppVersion` 1.0.0
