import { Plugin, Platform, WorkspaceLeaf } from 'obsidian';
import { NoteZoomSettings, DEFAULT_SETTINGS } from './types';
import { NoteZoomSettingTab } from './settings';
import { onSingleOrDouble } from './dblclick';
import { createZoomSlider } from './slider';
import { t, type Lang } from './i18n';

// ── 常量 ──
const SELECTOR = '.cm-scroller, .markdown-preview-view';
const ZOOM_DEFAULT = 1.0;
const SAVE_DEBOUNCE_MS = 300;
const DOUBLE_CLICK_MS = 300;
const PRESET_EPSILON = 0.005;
const LAYOUT_DEBOUNCE_MS = 50;
const INIT_DELAY_MS = 200;

// ── 类型补丁：以下属性在 Obsidian 运行时存在但官方类型定义未包含 ──
function leafId(leaf: WorkspaceLeaf): string {
	return (leaf as any).id as string;
}

function setElementZoom(el: HTMLElement, z: number) {
	(el.style as any).zoom = String(z);
}

function clearElementZoom(el: HTMLElement) {
	(el.style as any).zoom = '';
}

export default class NoteZoomPlugin extends Plugin {
	settings: NoteZoomSettings;
	zoomLevels: Map<string, number>;
	noteZoomLevels: Map<string, number>;
	statusBarEl: HTMLElement;
	private _saveTimer: number | null = null;
	private _pinchBase: number = 1.0;
	private _sliderPopup: HTMLElement | null = null;
	private _closeSlider: (() => void) | null = null;

	/** 多语言翻译：从 i18n.ts 词典按当前语言查表 */
	private _(key: string): string {
		return t(key, this.settings.language);
	}

	async onload() {
		await this.loadSettings();

		// ── 状态栏 ──
		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('note-zoom-status');
		this.updateStatusBar(ZOOM_DEFAULT);
		const handleClick = onSingleOrDouble(
			() => this.cyclePreset(),
			() => this.openZoomSlider(),
			DOUBLE_CLICK_MS,
		);
		this.registerDomEvent(this.statusBarEl, 'click', handleClick);

		// ── 设置面板 ──
		this.addSettingTab(new NoteZoomSettingTab(this.app, this));

		// ── 命令 ──
		this.addCommand({
			id: 'zoom-in',
			name: this._('cmd.zoomIn'),
			callback: () => this.adjust(this.settings.zoomStep),
		});
		this.addCommand({
			id: 'zoom-out',
			name: this._('cmd.zoomOut'),
			callback: () => this.adjust(-this.settings.zoomStep),
		});
		this.addCommand({
			id: 'zoom-reset',
			name: this._('cmd.zoomReset'),
			callback: () => this.setLeafZoom(ZOOM_DEFAULT),
		});

		// ── 滚轮 ──
		this.registerDomEvent(
			document,
			'wheel',
			(e: WheelEvent) => this.onWheel(e),
			{ passive: false, capture: false },
		);

		// ── 触控板双指捏合 ──
		const gs = (e: Event) => this.onGestureStart(e);
		const gc = (e: Event) => this.onGestureChange(e);
		const ge = (e: Event) => this.onGestureEnd(e);
		document.addEventListener('gesturestart', gs, { passive: false });
		document.addEventListener('gesturechange', gc, { passive: false });
		document.addEventListener('gestureend', ge);
		this.register(() => {
			document.removeEventListener('gesturestart', gs);
			document.removeEventListener('gesturechange', gc);
			document.removeEventListener('gestureend', ge);
		});

		// ── 标签 / 文件切换 ──
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf) Promise.resolve().then(() => this.applyToLeaf(leaf));
			}),
		);
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				if (this.settings.zoomMode !== 'note') return;
				const leaf = this.app.workspace.activeLeaf;
				if (leaf) Promise.resolve().then(() => this.applyToLeaf(leaf));
			}),
		);

		// ── 布局变化 ──
		let layoutTimer: ReturnType<typeof setTimeout> | null = null;
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				if (layoutTimer) clearTimeout(layoutTimer);
				layoutTimer = setTimeout(() => {
					this.prune();
					const leaf = this.app.workspace.activeLeaf;
					if (leaf) this.applyToLeaf(leaf);
				}, LAYOUT_DEBOUNCE_MS);
			}),
		);

		// ── 初始化 ──
		const leaf = this.app.workspace.activeLeaf;
		if (leaf) setTimeout(() => this.applyToLeaf(leaf), INIT_DELAY_MS);
	}

	onunload() {
		if (this._closeSlider) this._closeSlider();
		try {
			for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
				const el = this.findView(leaf) as HTMLElement | null;
				if (el) clearElementZoom(el);
			}
		} catch (_) { /* 安全卸载 */ }
	}

	// ═══════════════════════════════════════
	//  设置持久化
	// ═══════════════════════════════════════

	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings);

		if (!data?.settings?.modifierKey) {
			this.settings.modifierKey = Platform.isMacOS ? 'Meta' : 'Ctrl';
		}

		this.zoomLevels = new Map();
		if (data?.zoomLevels) {
			for (const [id, z] of Object.entries(data.zoomLevels)) {
				this.zoomLevels.set(id, z as number);
			}
		}

		this.noteZoomLevels = new Map();
		if (data?.noteZoomLevels) {
			for (const [id, z] of Object.entries(data.noteZoomLevels)) {
				this.noteZoomLevels.set(id, z as number);
			}
		}
	}

	async saveSettings() {
		await this.saveData({
			settings: this.settings,
			zoomLevels: Object.fromEntries(this.zoomLevels),
			noteZoomLevels: Object.fromEntries(this.noteZoomLevels),
		});
	}

	// ═══════════════════════════════════════
	//  核心缩放逻辑
	// ═══════════════════════════════════════

	findView(leaf: WorkspaceLeaf): Element | null {
		if (!leaf?.view?.containerEl) return null;
		return leaf.view.containerEl.querySelector(SELECTOR);
	}

	getZoomKey(leaf: WorkspaceLeaf): string {
		if (this.settings.zoomMode === 'note') {
			const path = this.getActiveFilePath(leaf);
			if (path) return path;
		}
		return leafId(leaf);
	}

	getActiveFilePath(leaf: WorkspaceLeaf): string | null {
		const view = leaf.view;
		if (!view || view.getViewType() !== 'markdown') return null;
		return (view as any).file?.path || null;
	}

	getZoom(leaf: WorkspaceLeaf): number {
		if (this.settings.zoomMode === 'note') {
			const path = this.getActiveFilePath(leaf);
			if (path && this.noteZoomLevels.has(path)) {
				return this.noteZoomLevels.get(path)!;
			}
			return ZOOM_DEFAULT;
		}
		return this.zoomLevels.has(leafId(leaf)) ? this.zoomLevels.get(leafId(leaf))! : ZOOM_DEFAULT;
	}

	setZoom(leaf: WorkspaceLeaf, zoom: number) {
		const z = Math.max(
			this.settings.minZoom,
			Math.min(this.settings.maxZoom, Math.round(zoom * 100) / 100),
		);
		const key = this.getZoomKey(leaf);
		if (this.settings.zoomMode === 'note') {
			this.noteZoomLevels.set(key, z);
		} else {
			this.zoomLevels.set(key, z);
		}
		this.applyToLeaf(leaf);
		this.saveDebounced();
	}

	applyToLeaf(leaf: WorkspaceLeaf) {
		if (!leaf?.view || leaf.view.getViewType() !== 'markdown') return;
		const el = this.findView(leaf) as HTMLElement | null;
		if (!el) return;
		const z = this.getZoom(leaf);
		setElementZoom(el, z);
		this.updateStatusBar(z);
	}

	adjust(delta: number) {
		const leaf = this.activeLeaf();
		if (leaf) this.setZoom(leaf, this.getZoom(leaf) + delta);
	}

	setLeafZoom(z: number) {
		const leaf = this.activeLeaf();
		if (leaf) this.setZoom(leaf, z);
	}

	activeLeaf(): WorkspaceLeaf | null {
		const leaf = this.app.workspace.activeLeaf;
		if (!leaf?.view || leaf.view.getViewType() !== 'markdown') return null;
		return leaf;
	}

	prune() {
		if (this.settings.zoomMode === 'tab') {
			const ids = new Set<string>();
			this.app.workspace.iterateAllLeaves((l) => ids.add(leafId(l)));
			for (const id of this.zoomLevels.keys()) {
				if (!ids.has(id)) this.zoomLevels.delete(id);
			}
		} else {
			for (const path of this.noteZoomLevels.keys()) {
				if (!this.app.vault.getAbstractFileByPath(path)) {
					this.noteZoomLevels.delete(path);
				}
			}
		}
	}

	// ═══════════════════════════════════════
	//  状态栏
	// ═══════════════════════════════════════

	updateStatusBar(z: number) {
		const label =
			this.settings.modifierKey === 'Meta' ? '⌘' :
			this.settings.modifierKey === 'Alt' ? 'Alt' : 'Ctrl';
		this.statusBarEl.setText(`🔍 ${Math.round(z * 100)}%`);
		const tip = this._('statusBar.tooltip').replace('{mod}', label);
		this.statusBarEl.setAttribute('aria-label', tip);
		this.statusBarEl.setAttribute('title', tip);
	}

	/** 语言切换后刷新状态栏提示文字 */
	refreshStatusBar() {
		const leaf = this.app.workspace.activeLeaf;
		if (leaf) {
			this.applyToLeaf(leaf);
		} else {
			this.updateStatusBar(ZOOM_DEFAULT);
		}
	}

	// ═══════════════════════════════════════
	//  滚轮
	// ═══════════════════════════════════════

	isModifierActive(e: WheelEvent): boolean {
		switch (this.settings.modifierKey) {
			case 'Meta': return e.metaKey;
			case 'Alt': return e.altKey;
			default:    return e.ctrlKey;
		}
	}

	onWheel(e: WheelEvent) {
		if (!this.isModifierActive(e)) return;
		const leaf = this.activeLeaf();
		if (!leaf) return;
		e.preventDefault();
		this.adjust(e.deltaY > 0 ? -this.settings.zoomStep : this.settings.zoomStep);
	}

	// ═══════════════════════════════════════
	//  触控板双指捏合（需先点一下笔记获取焦点）
	// ═══════════════════════════════════════

	onGestureStart(e: Event) {
		const leaf = this.activeLeaf();
		if (!leaf) return;
		e.preventDefault();
		this._pinchBase = this.getZoom(leaf);
	}

	onGestureChange(e: Event) {
		const ge = e as any;
		if (typeof ge.scale !== 'number') return;
		const leaf = this.activeLeaf();
		if (!leaf) return;
		e.preventDefault();
		const s = this.settings.pinchSensitivity;
		const newZoom = this._pinchBase * (1 + (ge.scale - 1) * s);
		this.setLeafZoom(newZoom);
	}

	onGestureEnd(_e: Event) { /* 缩放已在 gesturechange 中实时应用 */ }

	// ═══════════════════════════════════════
	//  预设循环
	// ═══════════════════════════════════════

	parsePresets(): number[] {
		return this.settings.presets
			.split(',')
			.map(s => parseFloat(s.trim()))
			.filter(n => !isNaN(n) && n > 0)
			.sort((a, b) => a - b);
	}

	cyclePreset() {
		const leaf = this.activeLeaf();
		if (!leaf) return;
		const cur = this.getZoom(leaf);
		const presets = this.parsePresets();
		if (presets.length === 0) return;
		const next = presets.find(p => p > cur + PRESET_EPSILON) || presets[0];
		this.setZoom(leaf, next);
	}

	// ═══════════════════════════════════════
	//  双击弹出缩放滑块
	// ═══════════════════════════════════════

	openZoomSlider() {
		if (this._sliderPopup) return;
		const leaf = this.activeLeaf();
		if (!leaf) return;

		const { popup, close } = createZoomSlider(
			this.getZoom(leaf),
			this.settings.minZoom,
			this.settings.maxZoom,
			this.settings.zoomStep,
			(z) => this.setLeafZoom(z),
			this.statusBarEl,
			() => { this._sliderPopup = null; this._closeSlider = null; },
		);
		this._sliderPopup = popup;
		this._closeSlider = close;
	}

	closeSlider() {
		if (this._closeSlider) {
			this._closeSlider();
			this._sliderPopup = null;
			this._closeSlider = null;
		}
	}

	// ═══════════════════════════════════════
	//  防抖持久化
	// ═══════════════════════════════════════

	saveDebounced() {
		if (this._saveTimer) clearTimeout(this._saveTimer);
		this._saveTimer = window.setTimeout(() => this.saveSettings(), SAVE_DEBOUNCE_MS);
	}
}
