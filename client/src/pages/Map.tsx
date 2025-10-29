import Map from '../components/Map'
import Layout from '../components/Layout'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SokcetProvider'
import { RobotStatus } from '../models/robot'

// Цвета для каждого статуса
const statusColors: Record<string, string> = {
	[RobotStatus.AVAILABLE]: '#007bff', // Синий - "в сети"
	[RobotStatus.IN_OPERATION]: '#28a745', // Зеленый - "в работе"
	[RobotStatus.CHARGING]: '#ffc107', // Желтый - "заряжается"
	[RobotStatus.BROKEN_CONNECT]: '#dc3545', // Красный - "не в сети"
}

export default function MapPage() {
	const [isActive, setIsActive] = useState(true)
	const [lat, setLat] = useState(52.021273475816855)
	const [lng, setLng] = useState(47.771636785181634)
	const navigate = useNavigate()
	const { statusSummary, robotData } = useSocket()

	// Нормализуем статусы
	const normalizedStatusSummary = {
		[RobotStatus.AVAILABLE]: statusSummary?.AVAILABLE || 0,
		[RobotStatus.IN_OPERATION]: statusSummary?.IN_OPERATION || 0,
		[RobotStatus.CHARGING]: statusSummary?.CHARGING || 0,
		[RobotStatus.BROKEN_CONNECT]: statusSummary?.BROKEN_CONNECT || 0,
	}

	// Общее количество подключенных устройств
	const totalConnectedRobots =
		robotData?.connected_robots ||
		Object.values(normalizedStatusSummary).reduce(
			(sum, count) => sum + count,
			0
		)

	useEffect(() => {
		const block = document.getElementById('statusContainer')
		if (!block) return

		block.classList.toggle('closed', !isActive)
		block.classList.toggle('opened', isActive)
	}, [isActive])

	return (
		<Layout>
			<div className='pageContent'>
				<div className='mapContainerMain'>
					<Map lat={lat} lng={lng} usedInTaskForm={true} />
				</div>
				<div id='statusContainer'>
					<h3>Статусы техники. Всего: {totalConnectedRobots} единиц</h3>
					<button
						className='closeButtonstatusContainer'
						onClick={() => setIsActive(!isActive)}
					>
						{isActive ? '﹀' : '︿'}
					</button>
					<div id='statusBarChart'>
						{Object.entries(normalizedStatusSummary)
							.filter(([_, count]) => count > 0)
							.map(([status, count]) => (
								<div key={status} className='statusRow'>
									<span className='statusLabel'>{status}</span>
									<div className='statusBarContainer'>
										<div
											className='statusBar'
											style={{
												width:
													totalConnectedRobots > 0
														? `${(count / totalConnectedRobots) * 100}%`
														: '0%',
												backgroundColor: statusColors[status],
											}}
										>
											<span className='statusCount'>{count}</span>
										</div>
									</div>
								</div>
							))}
					</div>
				</div>
			</div>
		</Layout>
	)
}
