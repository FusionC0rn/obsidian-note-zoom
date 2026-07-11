import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteZoomPlugin from './main';
import { t, type Lang } from './i18n';

const LANGS: Record<Lang, string> = {
	en: 'English',
	zh: '简体中文',
	'zh-TW': '繁體中文',
	ja: '日本語',
	ko: '한국어',
};

export class NoteZoomSettingTab extends PluginSettingTab {
	plugin: NoteZoomPlugin;

	constructor(app: App, plugin: NoteZoomPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private t(key: string): string {
		return t(key, this.plugin.settings.language);
	}

	display(): void {
		const lang = this.plugin.settings.language;
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('note-zoom-settings');

		// ── Language ──
		new Setting(containerEl)
			.setName(this.t('language'))
			.setDesc(this.t('language.desc'))
			.addDropdown(d => d
				.addOptions(LANGS)
				.setValue(lang)
				.onChange(async (value) => {
					this.plugin.settings.language = value as Lang;
					await this.plugin.saveSettings();
					this.display();
					this.plugin.refreshStatusBar();
				}));

		// ── Modifier Key ──
		new Setting(containerEl)
			.setName(this.t('modifierKey'))
			.setDesc(this.t('modifierKey.desc'))
			.addDropdown(d => d
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

		// ── Zoom Step ──
		const stepName = this.t('zoomStep');
		const stepSetting = new Setting(containerEl)
			.setName(`${stepName}  ${this.plugin.settings.zoomStep}`)
			.setDesc(this.t('zoomStep.desc'))
			.addSlider(s => s
				.setLimits(0.05, 0.5, 0.05)
				.setValue(this.plugin.settings.zoomStep)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.zoomStep = value;
					await this.plugin.saveSettings();
					stepSetting.nameEl.setText(`${stepName}  ${value}`);
				}));

		// ── Pinch Sensitivity ──
		const pinchName = this.t('pinchSensitivity');
		const pinchSetting = new Setting(containerEl)
			.setName(`${pinchName}  ${this.plugin.settings.pinchSensitivity}`)
			.setDesc(this.t('pinchSensitivity.desc'))
			.addSlider(s => s
				.setLimits(0.1, 2.0, 0.1)
				.setValue(this.plugin.settings.pinchSensitivity)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.pinchSensitivity = value;
					await this.plugin.saveSettings();
					pinchSetting.nameEl.setText(`${pinchName}  ${value}`);
				}));

		// ── Min Zoom ──
		const minName = this.t('minZoom');
		const minSetting = new Setting(containerEl)
			.setName(`${minName}  ${this.plugin.settings.minZoom}`)
			.setDesc(this.t('minZoom.desc'))
			.addSlider(s => s
				.setLimits(0.1, 1.0, 0.05)
				.setValue(this.plugin.settings.minZoom)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.minZoom = value;
					await this.plugin.saveSettings();
					minSetting.nameEl.setText(`${minName}  ${value}`);
				}));

		// ── Max Zoom ──
		const maxName = this.t('maxZoom');
		const maxSetting = new Setting(containerEl)
			.setName(`${maxName}  ${this.plugin.settings.maxZoom}`)
			.setDesc(this.t('maxZoom.desc'))
			.addSlider(s => s
				.setLimits(1.5, 5.0, 0.1)
				.setValue(this.plugin.settings.maxZoom)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxZoom = value;
					await this.plugin.saveSettings();
					maxSetting.nameEl.setText(`${maxName}  ${value}`);
				}));

		// ── Zoom Mode ──
		new Setting(containerEl)
			.setName(this.t('zoomMode'))
			.setDesc(this.t('zoomMode.desc'))
			.addDropdown(d => d
				.addOptions({
					'tab': this.t('zoomMode.tab'),
					'note': this.t('zoomMode.note'),
				})
				.setValue(this.plugin.settings.zoomMode)
				.onChange(async (value) => {
					this.plugin.settings.zoomMode = value as 'tab' | 'note';
					await this.plugin.saveSettings();
				}));

		// ── Presets ──
		new Setting(containerEl)
			.setName(this.t('presets'))
			.setDesc(this.t('presets.desc'))
			.addText(text => text
				.setValue(this.plugin.settings.presets)
				.setPlaceholder('0.8,0.9,1.0,1.1,1.2,1.5')
				.onChange(async (value) => {
					this.plugin.settings.presets = value;
					await this.plugin.saveSettings();
				}));
	}
}
