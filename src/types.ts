import type { Lang } from './i18n';

export interface NoteZoomSettings {
	modifierKey: 'Ctrl' | 'Meta' | 'Alt';
	zoomStep: number;
	minZoom: number;
	maxZoom: number;
	presets: string;
	zoomMode: 'tab' | 'note';
	pinchSensitivity: number;
	language: Lang;
}

export const DEFAULT_SETTINGS: NoteZoomSettings = {
	modifierKey: 'Ctrl',
	zoomStep: 0.1,
	minZoom: 0.3,
	maxZoom: 3.0,
	presets: '0.8,0.9,1.0,1.1,1.2,1.5',
	zoomMode: 'tab',
	pinchSensitivity: 0.1,
	language: 'en',
};
