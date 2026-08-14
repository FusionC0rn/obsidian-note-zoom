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
	const popup = document.body.createEl('div', { cls: 'note-zoom-slider-popup' });

	const rect = anchor.getBoundingClientRect();
	const bottom = `${window.innerHeight - rect.top + 8}px`;
	const left = `${Math.min(rect.left, window.innerWidth - 250)}px`;
	const cssPopup = popup as HTMLElement & { setCssProps?: (props: Record<string, string>) => void };
	if (typeof cssPopup.setCssProps === 'function') {
		cssPopup.setCssProps({ '--nz-bottom': bottom, '--nz-left': left });
	} else {
		popup.style.bottom = bottom;
		popup.style.left = left;
	}

	let label: HTMLElement;
	const input = popup.createEl('input', {
		attr: {
			type: 'range',
			min: String(min),
			max: String(max),
			step: String(step),
			value: String(cur),
		},
	});
	input.addEventListener('input', () => {
		const z = parseFloat(input.value);
		label.textContent = `${Math.round(z * 100)}%`;
		onChange(z);
	});
	label = popup.createEl('span', { text: `${Math.round(cur * 100)}%` });

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
