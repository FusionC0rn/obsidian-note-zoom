# Note Zoom

Hold a modifier key + scroll to visually zoom notes in and out. Lightweight, instant — each tab remembers its own zoom, sidebar stays untouched.

*Mac auto-detects ⌘ Cmd, Windows/Linux defaults to Ctrl. Everything configurable.*

---

## ✨ Features

- **Ctrl/Cmd + Scroll** to zoom in/out — lightweight, instant visual scaling
- **Pinch-to-zoom** — two-finger pinch on Precision Touchpads (Mac & Windows)
- **Per-tab memory** — every tab remembers its own zoom level independently
- **Per-note mode** (optional) — each note file remembers its zoom, persists across tab switches
- **Sidebar & UI unaffected** — only the note content scales, toolbar and panels stay sharp
- **Status bar indicator** — shows current zoom %, click to cycle presets
- **3 commands** — Zoom in, Zoom out, Reset zoom (hotkey-friendly)
- **Language toggle** — switch between English and 中文 in plugin settings
- **Fully configurable** — modifier key, step size, range limits, presets, zoom mode, pinch sensitivity

---

## 🎬 Demo

**Ctrl/Cmd + Scroll to zoom:**

![zoom demo](https://yumiblog-1330999844.cos.ap-guangzhou.myqcloud.com/piccip/zoom-demo22.gif)

**Click status bar to cycle presets:**

![zoom demo2](https://yumiblog-1330999844.cos.ap-guangzhou.myqcloud.com/piccip/zoom-demo11.gif)

---

## 📦 Installation

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/FusionC0rn/obsidian-note-zoom/releases)
2. Create a folder: `<vault>/.obsidian/plugins/note-zoom/`
3. Drop both files in
4. Settings → Community plugins → enable **Note Zoom**
5. Reload Obsidian

### From Source

```bash
cd <vault>/.obsidian/plugins
git clone https://github.com/FusionC0rn/obsidian-note-zoom.git note-zoom
cd note-zoom
npm install
npm run build
```

Then enable the plugin and reload.

---

## 🕹️ Usage

| Action | How |
|--------|-----|
| Zoom in | Hold modifier key + scroll up |
| Zoom out | Hold modifier key + scroll down |
| Pinch to zoom | Two-finger pinch on touchpad |
| Cycle presets | Click 🔍 in the status bar |
| Reset to 100% | `Ctrl+P` → `Reset zoom` |

All three commands are bindable to custom hotkeys in **Settings → Hotkeys**.

---

## ⚙️ Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Language | Dropdown | English | Switch plugin UI between English and 中文 |
| Modifier Key | Dropdown | Ctrl (Win) / ⌘ Cmd (Mac) | Which key to hold while scrolling |
| Zoom Step | Slider | 0.1 | How much each scroll tick changes zoom |
| Pinch Sensitivity | Slider | 0.1 | How fast pinch-to-zoom responds |
| Min Zoom | Slider | 0.3 | Smallest allowed zoom ratio |
| Max Zoom | Slider | 3.0 | Largest allowed zoom ratio |
| Zoom Mode | Dropdown | Per Tab | Per Tab: tab-based memory. Per Note: file-based memory |
| Preset Zoom Levels | Text | 0.8,0.9,1.0,1.1,1.2,1.5 | Comma-separated; click status bar to cycle |

<p align="center">
  <sub>🐣 Beta — testing with friends before community store submission</sub>
</p>
