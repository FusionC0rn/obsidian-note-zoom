# Note Zoom

Zoom your notes like a webpage — hold a modifier key and scroll. Each tab remembers its own zoom level, sidebar stays untouched.

*Mac auto-detects ⌘ Cmd, Windows/Linux defaults to Ctrl. Everything configurable.*

---

## ✨ Features

- **Ctrl/Cmd + Scroll** to zoom in/out — just like a browser
- **Per-tab memory** — every tab remembers its own zoom level independently
- **Sidebar unaffected** — only the note body scales, UI stays sharp
- **Status bar indicator** — shows current zoom %, click to cycle presets
- **3 commands** — Zoom in, Zoom out, Reset zoom (hotkey-friendly)
- **Fully configurable** — modifier key, step size, range limits, presets

---

## 🎬 Demo

![zoom demo](https://yumiblog-1330999844.cos.ap-guangzhou.myqcloud.com/piccip/01-demo.gif)

---

## 📦 Installation

### Manual

1. Download `main.js` and `manifest.json` from [here](https://github.com/FusionC0rn/obsidian-note-zoom/tags))
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
| Cycle presets | Click 🔍 in the status bar |
| Reset to 100% | Command palette → `Reset zoom` |

**Commands** (bindable to hotkeys in Settings → Hotkeys):

- `Zoom in / 放大`
- `Zoom out / 缩小`
- `Reset zoom / 重置缩放`

---

## ⚙️ Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Modifier Key | Dropdown | Ctrl (Win) / ⌘ Cmd (Mac) | Which key to hold while scrolling |
| Zoom Step | Slider | 0.1 | How much each scroll tick changes zoom |
| Min Zoom | Slider | 0.3 | Smallest allowed zoom ratio |
| Max Zoom | Slider | 3.0 | Largest allowed zoom ratio |
| Preset Zoom Levels | Text | 0.8,0.9,1.0,1.1,1.2,1.5 | Comma-separated; click status bar to cycle |

![settings](https://yumiblog-1330999844.cos.ap-guangzhou.myqcloud.com/piccip/02-settings.png)

---

## ⌨️ Commands

![commands](https://yumiblog-1330999844.cos.ap-guangzhou.myqcloud.com/piccip/03-commands.png)

---

## 🔧 Tech Stack

- TypeScript + esbuild
- No external dependencies (only `obsidian` at runtime)
- CJS output, ES2018 target

```bash
npm run dev      # build with sourcemap
npm run build    # type-check + production build (minified)
```

---

## 📄 License

MIT © Fusioncorn

---

<p align="center">
  <sub>🐣 Beta — testing with friends before community store submission</sub>
</p>
