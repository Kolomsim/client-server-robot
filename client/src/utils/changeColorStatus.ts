export const StatusColorChange = () => {
	const statusElements = document.querySelectorAll('.robotStatus')
	console.log(statusElements)

	statusElements.forEach(element => {
		element.classList.remove('online', 'offline', 'charging', 'in-operation')

		const status = element.textContent?.trim().toLowerCase()
		console.log(status)
		switch (status) {
			case 'не в сети':
				element.classList.add('offline')
				break
			case 'заряжается':
				element.classList.add('charging')
				break
			case 'в работе':
				element.classList.add('in-operation')
				break
			default:
				element.classList.add('online')
		}
	})
}
