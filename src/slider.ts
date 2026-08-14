/**
 * 创建一个浮窗缩放滑块，定位在 anchor 上方。
 * 静态样式在 styles.css，动态定位用 setCssProps（老版本回退直接赋值）。
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

	const rect = anchor.getBoundingClientRect();
	const bottom = `${window.innerHeight - rect.top + 8}px`;
	const left = `${Math.min(rect.left, window.innerWidth - 250)}px`;
	const anyPopup = popup as any;
	if (typeof anyPopup.setCssProps === 'function') {
		anyPopup.setCssProps({ '--nz-bottom': bottom, '--nz-left': left });
	} else {
		popup.style.bottom = bottom;
		popup.style.left = left;
	}

	const label = document.createElement('span');
	label.textContent = `${Math.round(cur * 100)}%`;

	const input = document.createElement('input');
	input.type = 'range';
	input.min = String(min);
	input.max = String(max);
	input.step = String(step);
	input.value = String(cur);
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
	window.setTimeout(() => document.addEventListener('click', onClickOutside), 0);

	return { popup, close };
}
