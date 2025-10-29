export const BatteryColorChange = () => {
	const elements = document.querySelectorAll(`.battery-level`)
	if (!elements) {
		return
	}
	elements.forEach(element => {
		element.classList.remove('high-charge', 'medium-charge', 'low-charge')

		let styleValue = window.getComputedStyle(element).getPropertyValue('width')
		const parentWidth = element.parentElement?.offsetWidth || 1
		const percent = (parseFloat(styleValue) / parentWidth) * 100
		if (percent > 50 && percent < 101) {
			element.classList.add('high-charge')
		}
		if (percent > 20 && percent < 51) {
			element.classList.add('medium-charge')
		}
		if (percent < 20) {
			element.classList.add('low-charge')
		}
	})
}
