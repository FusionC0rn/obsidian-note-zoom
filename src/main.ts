import { Notice, Plugin, Platform, WorkspaceLeaf } from 'obsidian';
import { NoteZoomSettings, DEFAULT_SETTINGS } from './types';
import { NoteZoomSettingTab } from './settings';
import { onSingleOrDouble } from './dblclick';
import { createZoomSlider } from './slider';
import { createZoomIndicator } from './zoom-indicator';
import { t, type Lang } from './i18n';

// ── 常量 ──
// 阅读模式：外层 .markdown-reading-view（新版 Obsidian）优先，内层 .markdown-preview-view 兜底老版本
const SELECTOR_PREVIEW = '.markdown-reading-view, .markdown-preview-view';
// 编辑 / Live Preview 模式
const SELECTOR_SOURCE = '.cm-scroller';
// getMode 不可用（老版本）时的历史行为
const SELECTOR_LEGACY = '.cm-scroller, .markdown-preview-view';
const ZOOM_DEFAULT = 1.0;
const SAVE_DEBOUNCE_MS = 300;
const DOUBLE_CLICK_MS = 300;
const PRESET_EPSILON = 0.005;
const LAYOUT_DEBOUNCE_MS = 50;
const INIT_DELAY_MS = 200;
const PINCH_THROTTLE_MS = 16;

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
	private _registeredWindows = new Set<Window>();
	private _indicator = createZoomIndicator();
	private _viewElCache = new WeakMap<WorkspaceLeaf, { el: HTMLElement; mode: string }>();
	private _leafObservers = new Map<string, { leaf: WorkspaceLeaf; observer: MutationObserver }>();
	private _pinchPending: { leaf: WorkspaceLeaf; zoom: number; ev: Event } | null = null;
	private _lastPinchApply = 0;

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
		this.addCommand({
			id: 'zoom-reset-all',
			name: this._('cmd.resetAll'),
			callback: () => { void this.resetAllZoom(); },
		});

		// ── 滚轮 + 触控板（所有窗口）──
		this._registerWindowEvents(window);

		// ── 窗口管理：弹出窗口注册 ──
		// 通过 layout-change 自动发现弹出窗口的 document 并注册事件
		this._ensureWindowEvents();

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

		// ── 布局变化（含弹出窗口检测）──
		let layoutTimer: ReturnType<typeof setTimeout> | null = null;
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				if (layoutTimer) clearTimeout(layoutTimer);
				layoutTimer = setTimeout(() => {
					this._ensureWindowEvents();
					this._syncLeafObservers();
					this.prune();
					const leaf = this.app.workspace.activeLeaf;
					if (leaf) this.applyToLeaf(leaf);
				}, LAYOUT_DEBOUNCE_MS);
			}),
		);

		// ── 初始化 ──
		const leaf = this.app.workspace.activeLeaf;
		if (leaf) {
			this._syncLeafObservers();
			setTimeout(() => this.applyToLeaf(leaf), INIT_DELAY_MS);
		}
	}

	onunload() {
		if (this._closeSlider) this._closeSlider();
		this._indicator.destroy();
		for (const entry of this._leafObservers.values()) entry.observer.disconnect();
		this._leafObservers.clear();
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

		if (!data?.settings?.language) {
			this.settings.language = this._detectObsidianLanguage();
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

	/** 首次运行时跟随 Obsidian 界面语言 */
	private _detectObsidianLanguage(): Lang {
		try {
			const locale = localStorage.getItem('language') || '';
			if (locale.startsWith('zh-TW') || locale.startsWith('zh-HK')) return 'zh-TW';
			if (locale.startsWith('zh')) return 'zh';
			if (locale.startsWith('ja')) return 'ja';
			if (locale.startsWith('ko')) return 'ko';
		} catch (_) { /* localStorage 不可用时回退英文 */ }
		return 'en';
	}

	// ═══════════════════════════════════════
	//  核心缩放逻辑
	// ═══════════════════════════════════════

	findView(leaf: WorkspaceLeaf): Element | null {
		if (!leaf?.view?.containerEl) return null;
		const container = leaf.view.containerEl;
		// 模式感知：阅读模式只查阅读视图、编辑模式只查 cm-scroller，
		// 从机制上杜绝命中「隐藏的编辑器元素」
		const mode = this._viewMode(leaf.view);
		const cached = this._viewElCache.get(leaf);
		if (cached && cached.mode === mode && container.contains(cached.el)) {
			return cached.el;
		}
		const el = container.querySelector(this._selectorForMode(mode)) as HTMLElement | null;
		if (el) this._viewElCache.set(leaf, { el, mode });
		return el;
	}

	/** 读取视图模式：'preview' / 'source'；老版本无 getMode 时返回空串（走兼容选择器） */
	private _viewMode(view: any): string {
		if (typeof view?.getMode === 'function') return view.getMode();
		return '';
	}

	private _selectorForMode(mode: string): string {
		if (mode === 'preview') return SELECTOR_PREVIEW;
		if (mode === 'source') return SELECTOR_SOURCE;
		return SELECTOR_LEGACY;
	}

	/** 确保 leaf 有 DOM 哨兵：视图元素增删或 class 翻转（模式切换的两种形态）时，在重绘前立即重应用缩放 */
	private _ensureLeafObserver(leaf: WorkspaceLeaf) {
		const id = leafId(leaf);
		if (this._leafObservers.has(id)) return;
		const container = leaf.view.containerEl;
		// 观察 leaf 根容器：模式切换可能是容器替换（childList）或 class 翻转（attributes）
		const root = container.closest('.workspace-leaf') || container;
		const observer = new MutationObserver((records) => {
			for (const r of records) {
				if (r.type === 'attributes') {
					// class 翻转（如模式切换的显隐切换）——只关心落在缩放目标或其祖先上的变更
					if (this._isZoomTargetNode(r.target)) { this.applyToLeaf(leaf); return; }
					continue;
				}
				for (let i = 0; i < r.addedNodes.length; i++) {
					if (this._isZoomTargetNode(r.addedNodes[i])) { this.applyToLeaf(leaf); return; }
				}
				for (let i = 0; i < r.removedNodes.length; i++) {
					if (this._isZoomTargetNode(r.removedNodes[i])) { this.applyToLeaf(leaf); return; }
				}
			}
		});
		observer.observe(root, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class'],
		});
		this._leafObservers.set(id, { leaf, observer });
	}

	/** 同步所有 markdown leaf 的哨兵：新建缺失的、断开已关闭的 */
	private _syncLeafObservers() {
		const alive = new Set<string>();
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			alive.add(leafId(leaf));
			this._ensureLeafObserver(leaf);
		}
		for (const [id, entry] of this._leafObservers) {
			if (!alive.has(id)) {
				entry.observer.disconnect();
				this._leafObservers.delete(id);
			}
		}
	}

	/** 变更节点是否涉及缩放目标元素（本身匹配或包含其一）——用于过滤打字等无关变更 */
	private _isZoomTargetNode(node: Node): boolean {
		if (!(node instanceof Element)) return false;
		if (node.matches(SELECTOR_PREVIEW) || node.matches(SELECTOR_SOURCE)) return true;
		return !!(node.querySelector(SELECTOR_PREVIEW) || node.querySelector(SELECTOR_SOURCE));
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

	setZoom(leaf: WorkspaceLeaf, zoom: number): number {
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
		return z;
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

	/** 一键重置所有标签页与笔记的缩放（设置按钮与命令共用） */
	async resetAllZoom() {
		this.zoomLevels.clear();
		this.noteZoomLevels.clear();
		await this.saveSettings();
		for (const l of this.app.workspace.getLeavesOfType('markdown')) {
			this.applyToLeaf(l);
		}
		new Notice(this._('resetAll.done'));
	}

	activeLeaf(): WorkspaceLeaf | null {
		const leaf = this.app.workspace.activeLeaf;
		if (!leaf?.view || leaf.view.getViewType() !== 'markdown') return null;
		return leaf;
	}

	/** 从事件目标定位光标所在的 markdown leaf（跨窗口安全） */
	leafFromEvent(e: Event): WorkspaceLeaf | null {
		const target = e.target as Node | null;
		if (!(target instanceof Element)) return null;
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const el = leaf.view.containerEl;
			if (el && el.contains(target)) return leaf;
		}
		return null;
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
		const leaf = this.leafFromEvent(e);
		if (!leaf) return;
		e.preventDefault();
		const delta = e.deltaY > 0 ? -this.settings.zoomStep : this.settings.zoomStep;
		const z = this.setZoom(leaf, this.getZoom(leaf) + delta);
		this._indicator.show(e, z);
	}

	// ═══════════════════════════════════════
	//  触控板双指捏合
	// ═══════════════════════════════════════

	onGestureStart(e: Event) {
		const leaf = this.leafFromEvent(e);
		if (!leaf) return;
		e.preventDefault();
		this._flushPinch();
		this._pinchBase = this.getZoom(leaf);
	}

	onGestureChange(e: Event) {
		const ge = e as any;
		if (typeof ge.scale !== 'number') return;
		const leaf = this.leafFromEvent(e);
		if (!leaf) return;
		e.preventDefault();
		const s = this.settings.pinchSensitivity;
		const newZoom = this._pinchBase * (1 + (ge.scale - 1) * s);
		// 节流：始终存最新值，距上次应用满 16ms 才真正应用，
		// 节流窗口内的事件由后续事件或 gestureend 冲刷，无定时器、无卡死状态
		this._pinchPending = { leaf, zoom: newZoom, ev: e };
		if (performance.now() - this._lastPinchApply >= PINCH_THROTTLE_MS) {
			this._flushPinch();
		}
	}

	onGestureEnd(_e: Event) { this._flushPinch(); }

	private _flushPinch() {
		const p = this._pinchPending;
		this._pinchPending = null;
		if (!p) return;
		this._lastPinchApply = performance.now();
		const z = this.setZoom(p.leaf, p.zoom);
		this._indicator.show(p.ev, z);
	}

	// ═══════════════════════════════════════
	//  多窗口事件管理
	// ═══════════════════════════════════════

	/** 在指定 window 的 document 上注册 wheel + gesture 事件，幂等 */
	private _registerWindowEvents(win: Window) {
		if (this._registeredWindows.has(win)) return;
		this._registeredWindows.add(win);

		// Wheel
		this.registerDomEvent(
			win.document,
			'wheel',
			(e: WheelEvent) => this.onWheel(e),
			{ passive: false, capture: false },
		);

		// Gesture (Safari 双指捏合)
		const gs = (e: Event) => this.onGestureStart(e);
		const gc = (e: Event) => this.onGestureChange(e);
		const ge = (e: Event) => this.onGestureEnd(e);
		win.document.addEventListener('gesturestart', gs, { passive: false });
		win.document.addEventListener('gesturechange', gc, { passive: false });
		win.document.addEventListener('gestureend', ge);
		this.register(() => {
			win.document.removeEventListener('gesturestart', gs);
			win.document.removeEventListener('gesturechange', gc);
			win.document.removeEventListener('gestureend', ge);
			this._registeredWindows.delete(win);
		});
	}

	/** 遍历所有 leaf，为每个 leaf 所属的 window 注册事件 */
	private _ensureWindowEvents() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			const doc = leaf.view?.containerEl?.ownerDocument;
			if (doc?.defaultView) this._registerWindowEvents(doc.defaultView);
		});
	}

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
