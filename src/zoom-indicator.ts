/**
 * 缩放反馈气泡：
 * 每个窗口一个气泡实例，跟随光标显示当前缩放百分比，
 * 停止操作后自动淡出。支持弹出窗口（按事件所属 document 创建元素）。
 */
export function createZoomIndicator() {
	const bubbles = new Map<Window, HTMLElement>();
	const timers = new Map<Window, number>();
	const HIDE_DELAY_MS = 500;

	function show(e: Event, zoom: number) {
		const target = e.target as Element | null;
		const doc = target instanceof Element ? target.ownerDocument : null;
		const win = doc?.defaultView;
		if (!doc || !win) return;

		let bubble = bubbles.get(win);
		if (!bubble) {
			bubble = createBubble(doc);
			bubbles.set(win, bubble);
		}
		const b = bubble;

		b.textContent = `${Math.round(zoom * 100)}%`;

		// 优先事件坐标（光标跟随），否则窗口中央（捏合事件可能无坐标）
		const ev = e as any;
		const x = typeof ev.clientX === 'number' ? ev.clientX + 16 : win.innerWidth / 2;
		const y = typeof ev.clientY === 'number' ? ev.clientY + 16 : win.innerHeight / 2;
		b.style.left = `${Math.min(x, win.innerWidth - 70)}px`;
		b.style.top = `${Math.min(y, win.innerHeight - 40)}px`;
		b.style.opacity = '1';

		const old = timers.get(win);
		if (old) window.clearTimeout(old);
		timers.set(win, window.setTimeout(() => {
			b.style.opacity = '0';
			timers.delete(win);
		}, HIDE_DELAY_MS));
	}

	function createBubble(doc: Document): HTMLElement {
		const el = doc.createElement('div');
		el.classList.add('note-zoom-indicator');
		el.style.cssText = `
			position: fixed; z-index: 1000;
			pointer-events: none;
			background: var(--background-modifier-hover);
			color: var(--text-normal);
			border: 1px solid var(--background-modifier-border);
			border-radius: 6px; padding: 4px 10px;
			font-size: 13px; font-weight: 600;
			opacity: 0;
			transition: opacity 150ms ease;
		`;
		doc.body.appendChild(el);
		return el;
	}

	function destroy() {
		for (const timer of timers.values()) window.clearTimeout(timer);
		timers.clear();
		for (const bubble of bubbles.values()) bubble.remove();
		bubbles.clear();
	}

	return { show, destroy };
}
