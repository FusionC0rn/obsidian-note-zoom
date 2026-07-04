import { Plugin, Platform, WorkspaceLeaf } from 'obsidian';
import { NoteZoomSettings, DEFAULT_SETTINGS } from './types';
import { NoteZoomSettingTab } from './settings';

// Obsidian 类型补充：WorkspaceLeaf.id 和 CSSStyleDeclaration.zoom 在运行时存在但类型定义中缺失
declare module 'obsidian' {
	interface WorkspaceLeaf {
		id: string;
	}
}

interface ZoomableStyle extends CSSStyleDeclaration {
	zoom: string;
}

const SELECTOR = '.markdown-source-view, .markdown-reading-view';

export default class NoteZoomPlugin extends Plugin {
	settings: NoteZoomSettings;
	zoomLevels: Map<string, number>;
	statusBarEl: HTMLElement;
	private _saveTimer: number | null = null;

	async onload() {
		await this.loadSettings();

		// ── 状态栏 ──
		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('note-zoom-status');
		this.updateStatusBar(1.0);
		this.registerDomEvent(this.statusBarEl, 'click', () => this.cyclePreset());

		// ── 设置面板 ──
		this.addSettingTab(new NoteZoomSettingTab(this.app, this));

		// ── 命令 ──
		this.addCommand({
			id: 'zoom-in',
			name: 'Zoom in / 放大',
			callback: () => this.adjust(this.settings.zoomStep),
		});
		this.addCommand({
			id: 'zoom-out',
			name: 'Zoom out / 缩小',
			callback: () => this.adjust(-this.settings.zoomStep),
		});
		this.addCommand({
			id: 'zoom-reset',
			name: 'Reset zoom / 重置缩放',
			callback: () => this.setLeafZoom(1.0),
		});

		// ── 滚轮 ──
		this.registerDomEvent(
			document,
			'wheel',
			(e: WheelEvent) => this.onWheel(e),
			{ passive: false, capture: false },
		);

		// ── 标签切换 ──
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf) Promise.resolve().then(() => this.applyToLeaf(leaf));
			}),
		);

		// ── 布局变化（清理 + 重绘） ──
		let timer: ReturnType<typeof setTimeout> | null = null;
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				if (timer) clearTimeout(timer);
				timer = setTimeout(() => {
					this.prune();
					const leaf = this.app.workspace.activeLeaf;
					if (leaf) this.applyToLeaf(leaf);
				}, 50);
			}),
		);

		// ── 初始化 ──
		const leaf = this.app.workspace.activeLeaf;
		if (leaf) setTimeout(() => this.applyToLeaf(leaf), 200);
	}

	onunload() {
		try {
			for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
				const el = this.findView(leaf) as HTMLElement | null;
				if (el) (el.style as ZoomableStyle).zoom = '';
			}
		} catch (_) {
			// 安全卸载
		}
	}

	// ═══════════════════════════════════════
	//  设置持久化
	// ═══════════════════════════════════════

	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings);

		// 平台检测：Mac 默认用 ⌘ Cmd，Win/Linux 用 Ctrl
		// 仅在用户从未保存过 modifierKey 时自动设置
		if (!data?.settings?.modifierKey) {
			this.settings.modifierKey = Platform.isMacOS ? 'Meta' : 'Ctrl';
		}

		// 载入各标签页的缩放级别
		this.zoomLevels = new Map();
		if (data?.zoomLevels) {
			for (const [id, z] of Object.entries(data.zoomLevels)) {
				this.zoomLevels.set(id, z as number);
			}
		}
	}

	async saveSettings() {
		await this.saveData({
			settings: this.settings,
			zoomLevels: Object.fromEntries(this.zoomLevels),
		});
	}

	// ═══════════════════════════════════════
	//  核心缩放逻辑
	// ═══════════════════════════════════════

	findView(leaf: WorkspaceLeaf): Element | null {
		if (!leaf?.view?.containerEl) return null;
		return leaf.view.containerEl.querySelector(SELECTOR);
	}

	getZoom(leaf: WorkspaceLeaf): number {
		return this.zoomLevels.has(leaf.id) ? this.zoomLevels.get(leaf.id)! : 1.0;
	}

	setZoom(leaf: WorkspaceLeaf, zoom: number) {
		const z = Math.max(
			this.settings.minZoom,
			Math.min(this.settings.maxZoom, Math.round(zoom * 100) / 100),
		);
		this.zoomLevels.set(leaf.id, z);
		this.applyToLeaf(leaf);
		this.saveDebounced();
	}

	applyToLeaf(leaf: WorkspaceLeaf) {
		if (!leaf?.view || leaf.view.getViewType() !== 'markdown') return;
		const el = this.findView(leaf) as HTMLElement | null;
		if (!el) return;
		const z = this.getZoom(leaf);
		(el.style as ZoomableStyle).zoom = String(z);
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
		const ids = new Set<string>();
		this.app.workspace.iterateAllLeaves((l) => ids.add(l.id));
		for (const id of this.zoomLevels.keys()) {
			if (!ids.has(id)) this.zoomLevels.delete(id);
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
		this.statusBarEl.setAttribute(
			'aria-label',
			`${label}+Scroll to zoom · Click to cycle presets | ${label}+滚轮缩放 · 点击循环预设`,
		);
	}

	// ═══════════════════════════════════════
	//  滚轮事件
	// ═══════════════════════════════════════

	isModifierActive(e: WheelEvent): boolean {
		switch (this.settings.modifierKey) {
			case 'Meta': return e.metaKey;
			case 'Alt': return e.altKey;
			default: return e.ctrlKey;
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
		const next = presets.find(p => p > cur + 0.005) || presets[0];
		this.setZoom(leaf, next);
	}

	// ═══════════════════════════════════════
	//  防抖持久化
	// ═══════════════════════════════════════

	saveDebounced() {
		if (this._saveTimer) clearTimeout(this._saveTimer);
		this._saveTimer = window.setTimeout(() => this.saveSettings(), 300);
	}
}
