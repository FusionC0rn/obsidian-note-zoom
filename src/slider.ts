/**
 * 创建一个浮窗缩放滑块，定位在 anchor 上方。
 * 返回 popup 元素和关闭函数。
 */
export function createZoomSlider(
	cur: number,
	min: number,
	max: number,
	step: number,
	onChange: (z: number) => void,
	anchor: HTMLElement,
	onClose?: () => void,
) {
	const popup = document.createElement('div');
	popup.addClass('note-zoom-slider-popup');
	popup.style.cssText = `
		position: fixed; z-index: 1000;
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 8px; padding: 12px 16px;
		box-shadow: 0 4px 20px rgba(0,0,0,0.15);
		display: flex; align-items: center; gap: 10px; min-width: 220px;
	`;

	const rect = anchor.getBoundingClientRect();
	popup.style.bottom = `${window.innerHeight - rect.top + 8}px`;
	popup.style.left = `${Math.min(rect.left, window.innerWidth - 250)}px`;

	const label = document.createElement('span');
	Object.assign(label.style, {
		fontSize: '14px', fontWeight: '600',
		minWidth: '40px', textAlign: 'right',
	});
	label.textContent = `${Math.round(cur * 100)}%`;

	const input = document.createElement('input');
	input.type = 'range';
	input.min = String(min);
	input.max = String(max);
	input.step = String(step);
	input.value = String(cur);
	input.style.flex = '1';
	input.addEventListener('input', () => {
		const z = parseFloat(input.value);
		label.textContent = `${Math.round(z * 100)}%`;
		onChange(z);
	});

	popup.append(input, label);
	document.body.appendChild(popup);

	const close = () => {
		popup.remove();
		onClose?.();
	};

	// 点击外部关闭
	const onClickOutside = (e: MouseEvent) => {
		if (!popup.contains(e.target as Node) && e.target !== anchor) {
			close();
			document.removeEventListener('click', onClickOutside);
		}
	};
	setTimeout(() => document.addEventListener('click', onClickOutside), 0);

	return { popup, close };
}
