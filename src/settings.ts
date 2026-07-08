import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteZoomPlugin from './main';

export class NoteZoomSettingTab extends PluginSettingTab {
	plugin: NoteZoomPlugin;

	constructor(app: App, plugin: NoteZoomPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('note-zoom-settings');

		// ── Modifier Key / 修饰键 ──
		new Setting(containerEl)
			.setName('Modifier Key / 修饰键')
			.setDesc('Hold this key while scrolling to zoom. Mac recommends ⌘ Cmd, Win/Linux recommends Ctrl. | 缩放时需按住的功能键。Mac 推荐 ⌘ Cmd，Windows/Linux 推荐 Ctrl')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'Ctrl': 'Ctrl',
					'Meta': '⌘ Cmd (Mac)',
					'Alt': 'Alt',
				})
				.setValue(this.plugin.settings.modifierKey)
				.onChange(async (value) => {
					this.plugin.settings.modifierKey = value as 'Ctrl' | 'Meta' | 'Alt';
					await this.plugin.saveSettings();
				}));

		// ── Zoom Step / 缩放步长 ──
		const stepLabel = () => `Zoom Step / 缩放步长  ${this.plugin.settings.zoomStep}`;
		const stepSetting = new Setting(containerEl)
			.setName(stepLabel())
			.setDesc('How much each scroll tick changes the zoom level. | 每次滚轮调整的幅度')
			.addSlider(slider => slider
				.setLimits(0.05, 0.5, 0.05)
				.setValue(this.plugin.settings.zoomStep)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.zoomStep = value;
					await this.plugin.saveSettings();
					stepSetting.nameEl.setText(stepLabel());
				}));

		// ── Min Zoom / 最小缩放 ──
		const minLabel = () => `Min Zoom / 最小缩放  ${this.plugin.settings.minZoom}`;
		const minSetting = new Setting(containerEl)
			.setName(minLabel())
			.setDesc('Smallest allowed zoom ratio. | 允许缩小的最小比例')
			.addSlider(slider => slider
				.setLimits(0.1, 1.0, 0.05)
				.setValue(this.plugin.settings.minZoom)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.minZoom = value;
					await this.plugin.saveSettings();
					minSetting.nameEl.setText(minLabel());
				}));

		// ── Max Zoom / 最大缩放 ──
		const maxLabel = () => `Max Zoom / 最大缩放  ${this.plugin.settings.maxZoom}`;
		const maxSetting = new Setting(containerEl)
			.setName(maxLabel())
			.setDesc('Largest allowed zoom ratio. | 允许放大的最大比例')
			.addSlider(slider => slider
				.setLimits(1.5, 5.0, 0.1)
				.setValue(this.plugin.settings.maxZoom)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxZoom = value;
					await this.plugin.saveSettings();
					maxSetting.nameEl.setText(maxLabel());
				}));

		// ── Zoom Mode / 缩放模式 ──
		new Setting(containerEl)
			.setName('Zoom Mode / 缩放模式')
			.setDesc('Per-tab: each tab remembers its own zoom. Per-note: each note file remembers its zoom independently, even when opened in the same tab. | 标签页：每个标签页独立记忆。笔记：每个笔记文件独立记忆，同一标签页内跳转自动切换缩放')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'tab': 'Per Tab / 按标签页',
					'note': 'Per Note / 按笔记',
				})
				.setValue(this.plugin.settings.zoomMode)
				.onChange(async (value) => {
					this.plugin.settings.zoomMode = value as 'tab' | 'note';
					await this.plugin.saveSettings();
				}));

		// ── Presets / 预设值 ──
		new Setting(containerEl)
			.setName('Preset Zoom Levels / 预设缩放值')
			.setDesc('Comma-separated (e.g. 0.8,0.9,1.0,1.1,1.2,1.5). Click the status bar to cycle through these. | 逗号分隔。点击状态栏按此列表循环切换')
			.addText(text => text
				.setValue(this.plugin.settings.presets)
				.setPlaceholder('0.8,0.9,1.0,1.1,1.2,1.5')
				.onChange(async (value) => {
					this.plugin.settings.presets = value;
					await this.plugin.saveSettings();
				}));
	}
}
