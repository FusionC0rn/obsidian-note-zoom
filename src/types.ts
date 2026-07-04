export interface NoteZoomSettings {
	modifierKey: 'Ctrl' | 'Meta' | 'Alt';
	zoomStep: number;
	minZoom: number;
	maxZoom: number;
	presets: string;
}

export const DEFAULT_SETTINGS: NoteZoomSettings = {
	modifierKey: 'Ctrl', // 平台自动检测覆盖，此值为后备
	zoomStep: 0.1,
	minZoom: 0.3,
	maxZoom: 3.0,
	presets: '0.8,0.9,1.0,1.1,1.2,1.5',
};
