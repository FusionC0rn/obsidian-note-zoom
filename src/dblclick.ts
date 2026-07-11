/**
 * 创建单击/双击区分处理器。
 * 返回一个回调，在 delay 毫秒内连续调用两次触发 onDouble，否则触发 onSingle。
 */
export function onSingleOrDouble(
	onSingle: () => void,
	onDouble: () => void,
	delay = 300,
): () => void {
	let timer: number | null = null;
	return () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
			onDouble();
		} else {
			timer = window.setTimeout(() => {
				timer = null;
				onSingle();
			}, delay);
		}
	};
}
