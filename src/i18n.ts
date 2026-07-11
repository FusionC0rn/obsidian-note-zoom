export type Lang = 'en' | 'zh' | 'zh-TW' | 'ja' | 'ko';

const dict: Record<string, Record<Lang, string>> = {
	// ── Language ──
	'language': {
		en: 'Language', zh: '界面语言', 'zh-TW': '界面語言', ja: '言語', ko: '언어',
	},
	'language.desc': {
		en: 'Choose the display language for this plugin.',
		zh: '选择插件设置界面的显示语言。',
		'zh-TW': '選擇插件設定介面的顯示語言。',
		ja: 'プラグインの表示言語を選択します。',
		ko: '플러그인 표시 언어를 선택합니다.',
	},
	// ── Modifier Key ──
	'modifierKey': {
		en: 'Modifier Key', zh: '修饰键', 'zh-TW': '修飾鍵', ja: '修飾キー', ko: '수정 키',
	},
	'modifierKey.desc': {
		en: 'Hold this key while scrolling to zoom. Mac recommends ⌘ Cmd, Win/Linux recommends Ctrl.',
		zh: '缩放时需按住的功能键。Mac 推荐 ⌘ Cmd，Windows/Linux 推荐 Ctrl。',
		'zh-TW': '縮放時需按住的功能鍵。Mac 推薦 ⌘ Cmd，Windows/Linux 推薦 Ctrl。',
		ja: 'ズーム時に押すキー。Macは⌘ Cmd、Win/LinuxはCtrl推奨。',
		ko: '확대/축소 시 누르고 있을 키. Mac은 ⌘ Cmd, Win/Linux는 Ctrl 권장.',
	},
	// ── Zoom Step ──
	'zoomStep': {
		en: 'Zoom Step', zh: '缩放步长', 'zh-TW': '縮放步長', ja: 'ズーム刻み', ko: '확대/축소 단계',
	},
	'zoomStep.desc': {
		en: 'How much each scroll tick changes the zoom level.',
		zh: '每次滚轮调整的幅度。',
		'zh-TW': '每次滾輪調整的幅度。',
		ja: 'スクロール1回で変化するズーム量。',
		ko: '스크롤 한 번에 변화하는 확대/축소 정도.',
	},
	// ── Pinch Sensitivity ──
	'pinchSensitivity': {
		en: 'Pinch Sensitivity', zh: '捏合灵敏度', 'zh-TW': '捏合靈敏度', ja: 'ピンチ感度', ko: '핀치 감도',
	},
	'pinchSensitivity.desc': {
		en: 'How fast pinch-to-zoom responds. Lower = slower, finer control.',
		zh: '双指捏合缩放的响应速度。值越低越慢、越精细。',
		'zh-TW': '雙指捏合縮放的響應速度。值越低越慢、越精細。',
		ja: 'ピンチズームの反応速度。低いほど遅く、細かい制御が可能。',
		ko: '핀치 확대/축소 응답 속도. 낮을수록 느리고 정밀한 제어 가능.',
	},
	// ── Min Zoom ──
	'minZoom': {
		en: 'Min Zoom', zh: '最小缩放', 'zh-TW': '最小縮放', ja: '最小ズーム', ko: '최소 확대/축소',
	},
	'minZoom.desc': {
		en: 'Smallest allowed zoom ratio.',
		zh: '允许缩小的最小比例。',
		'zh-TW': '允許縮小的最小比例。',
		ja: '縮小できる最小の倍率。',
		ko: '축소 가능한 최소 비율.',
	},
	// ── Max Zoom ──
	'maxZoom': {
		en: 'Max Zoom', zh: '最大缩放', 'zh-TW': '最大縮放', ja: '最大ズーム', ko: '최대 확대/축소',
	},
	'maxZoom.desc': {
		en: 'Largest allowed zoom ratio.',
		zh: '允许放大的最大比例。',
		'zh-TW': '允許放大的最大比例。',
		ja: '拡大できる最大の倍率。',
		ko: '확대 가능한 최대 비율.',
	},
	// ── Zoom Mode ──
	'zoomMode': {
		en: 'Zoom Mode', zh: '缩放模式', 'zh-TW': '縮放模式', ja: 'ズームモード', ko: '확대/축소 모드',
	},
	'zoomMode.desc': {
		en: 'Per-tab: each tab remembers its own zoom. Per-note: each note file remembers its zoom independently.',
		zh: '标签页：每个标签页独立记忆。笔记：每个笔记文件独立记忆，同一标签页内跳转自动切换缩放。',
		'zh-TW': '分頁：每個分頁獨立記憶。筆記：每個筆記檔案獨立記憶，同一分頁內跳轉自動切換縮放。',
		ja: 'タブごと：各タブが個別にズームを記憶。ノートごと：各ノートファイルが独立してズームを記憶。',
		ko: '탭별: 각 탭이 개별적으로 확대/축소를 기억. 노트별: 각 노트 파일이 독립적으로 확대/축소를 기억.',
	},
	'zoomMode.tab': {
		en: 'Per Tab', zh: '按标签页', 'zh-TW': '按分頁', ja: 'タブごと', ko: '탭별',
	},
	'zoomMode.note': {
		en: 'Per Note', zh: '按笔记', 'zh-TW': '按筆記', ja: 'ノートごと', ko: '노트별',
	},
	// ── Presets ──
	'presets': {
		en: 'Preset Zoom Levels', zh: '预设缩放值', 'zh-TW': '預設縮放值', ja: 'プリセット', ko: '사전 설정',
	},
	'presets.desc': {
		en: 'Comma-separated (e.g. 0.8,0.9,1.0,1.1,1.2,1.5). Click the status bar to cycle through these.',
		zh: '逗号分隔。点击状态栏按此列表循环切换。',
		'zh-TW': '逗號分隔。點擊狀態欄按此列表循環切換。',
		ja: 'カンマ区切り（例: 0.8,0.9,1.0,1.1,1.2,1.5）。ステータスバーをクリックで切替。',
		ko: '쉼표로 구분 (예: 0.8,0.9,1.0,1.1,1.2,1.5). 상태 표시줄 클릭으로 순환.',
	},
	// ── Commands ──
	'cmd.zoomIn': {
		en: 'Zoom in', zh: '放大', 'zh-TW': '放大', ja: '拡大', ko: '확대',
	},
	'cmd.zoomOut': {
		en: 'Zoom out', zh: '缩小', 'zh-TW': '縮小', ja: '縮小', ko: '축소',
	},
	'cmd.zoomReset': {
		en: 'Reset zoom', zh: '重置缩放', 'zh-TW': '重設縮放', ja: 'ズームリセット', ko: '확대/축소 초기화',
	},
	// ── Status bar ──
	'statusBar.tooltip': {
		en: '{mod}+Scroll to zoom · Click to cycle presets · Double-click for slider',
		zh: '{mod}+滚轮缩放 · 点击循环预设 · 双击弹出滑块',
		'zh-TW': '{mod}+滾輪縮放 · 點擊循環預設 · 雙擊彈出滑塊',
		ja: '{mod}+スクロールでズーム · クリックでプリセット切替 · ダブルクリックでスライダー',
		ko: '{mod}+스크롤로 확대/축소 · 클릭으로 사전 설정 순환 · 더블클릭으로 슬라이더',
	},
};

/** 根据 key 和语言获取翻译文本 */
export function t(key: string, lang: Lang): string {
	return dict[key]?.[lang] || dict[key]?.en || key;
}
