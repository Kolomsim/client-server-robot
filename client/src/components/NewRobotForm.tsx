import { useState } from 'react'
import axios from 'axios'
import FocusBackground from './FocusBackground'

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

export default function NewRobotForm() {
	const [isFormActive, setIsFormActive] = useState(false)
	const [name, setName] = useState('')
	const [commissioningDate, setCommissioningDate] = useState('')
	const [lastMaintenanceDate, setLastMaintenanceDate] = useState('')
	const [serviceLife, setServiceLife] = useState('')
	const [message, setMessage] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			const newRobot = {
				name,
				commissioning_date: commissioningDate,
				last_maintenance_date: lastMaintenanceDate,
				service_life: Number(serviceLife),
			}

			await axios.post(`${API_URL}/robots/`, newRobot)
			setMessage('✅ Робот успешно добавлен')
			setName('')
			setCommissioningDate('')
			setLastMaintenanceDate('')
			setServiceLife('')
		} catch (error: any) {
			console.error('Ошибка при добавлении робота:', error)
			setMessage('❌ Ошибка при добавлении робота')
		}
	}

	return (
		<>
			<button className='openFormButton' onClick={() => setIsFormActive(true)}>
				+ Добавить робота
			</button>

			{isFormActive && (
				<>
					<FocusBackground
						isActive={isFormActive}
						setIsActive={setIsFormActive}
					/>

					<div className='popupForm'>
						<h2>Добавить нового робота</h2>
						<form onSubmit={handleSubmit}>
							<label>Имя:</label>
							<input
								type='text'
								value={name}
								onChange={e => setName(e.target.value)}
								required
							/>

							<label>Дата ввода в эксплуатацию:</label>
							<input
								type='date'
								value={commissioningDate}
								onChange={e => setCommissioningDate(e.target.value)}
								required
							/>

							<label>Дата последнего ТО:</label>
							<input
								type='date'
								value={lastMaintenanceDate}
								onChange={e => setLastMaintenanceDate(e.target.value)}
							/>

							<label>Срок службы (в днях):</label>
							<input
								type='number'
								value={serviceLife}
								onChange={e => setServiceLife(e.target.value)}
								required
							/>

							<button type='submit'>Добавить</button>
							<button
								type='button'
								className='closeButton'
								onClick={() => setIsFormActive(false)}
							>
								X
							</button>
						</form>
						{message && <p>{message}</p>}
					</div>
				</>
			)}
		</>
	)
}
