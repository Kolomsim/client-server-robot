import { useEffect } from 'react'
import { StatusColorChange } from '../utils/changeColorStatus.ts'
import { Robot, RobotStatus } from '../models/robot.tsx'

interface MoreRobotInfoCardProps {
	index: number
	setIsActive: (active: boolean) => void
	isActive: boolean
	robotData: Robot
}

export default function MoreRobotInfoCard({
	setIsActive,
	isActive,
	robotData,
}: MoreRobotInfoCardProps) {
	const robot = robotData

	const finalStatus =
		RobotStatus[robot.status as keyof typeof RobotStatus] || robot.status

	useEffect(() => {
		StatusColorChange()

		const observer = new MutationObserver(() => {
			StatusColorChange()
		})

		const statusElement = document.getElementById(
			`robotStatus-${robot.robot_id}`
		)
		if (statusElement) {
			observer.observe(statusElement, {
				characterData: true,
				subtree: true,
			})
		}

		return () => observer.disconnect()
	}, [finalStatus, robot.robot_id])

	function getStatusClass(currentStatus: RobotStatus): string {
		switch (currentStatus) {
			case RobotStatus.AVAILABLE:
				return 'online'
			case RobotStatus.CHARGING:
				return 'online'
			case RobotStatus.IN_OPERATION:
				return 'online'
			case RobotStatus.BROKEN_CONNECT:
				return 'offline'
			default:
				return 'offline'
		}
	}

	function getStatusText(status: RobotStatus): string {
		switch (status) {
			case RobotStatus.AVAILABLE:
				return 'Доступен'
			case RobotStatus.CHARGING:
				return 'Заряжается'
			case RobotStatus.IN_OPERATION:
				return 'В работе'
			case RobotStatus.BROKEN_CONNECT:
				return 'Не в сети'
			default:
				return 'Не в сети'
		}
	}

	function closeMoreRobotInfo() {
		setIsActive(false)
	}

	return (
		<div
			key={robot.robot_id}
			id='robotsMoreInfoCard'
			className={`taskForm ${isActive ? 'opened' : 'closed'} ${getStatusClass(
				finalStatus
			)}`}
		>
			<h3>Информация об устройстве</h3>
			<hr />
			<div className='infoSection'>
				<div className='nameAndPhotoBlock'>
					<img src='../../public/robologo.jpg' alt='Логотип робота' />
					<div className='textBlock'>
						<p id='tobotName'>{robot.deviceName}</p>
						<p
							id={`robotStatus-${robot.robot_id}`}
							className={`robotStatus ${getStatusClass(finalStatus)}`}
						>
							{getStatusText(finalStatus)}
						</p>
					</div>
				</div>
			</div>

			<h3>Показатели батареи</h3>
			<hr />
			<div className='infoSection'>
				<div className='infoBox'>
					<div className='headInfoBox'>Напряжение</div>
					<p>{robot.current_voltage} В</p>
				</div>
			</div>

			<h3>Показатели системы</h3>
			<hr />
			<div className='infoSection'>
				<div className='infoBox'>
					<div className='headInfoBox'>Частота процессора</div>
					<p>{robot.cpu_frequency} МГц</p>
				</div>
				<div className='infoBox'>
					<div className='headInfoBox'>Загруженность процессора</div>
					<p>{robot.cpu_usage} %</p>
				</div>
				<div className='infoBox'>
					<div className='headInfoBox'>Использование оперативной памяти</div>
					<p>{robot.memory_usage} %</p>
				</div>
			</div>

			<h3>Показатели связи и сенсоров</h3>
			<hr />
			<div className='infoSection'>
				<div className='infoBox'>
					<div className='headInfoBox'>Статус работы камеры</div>
					<p>{robot.camera_ok}</p>
				</div>
				<div className='infoBox'>
					<div className='headInfoBox'>Статус работы лидара</div>
					<p>{robot.lidar_ok}</p>
				</div>
			</div>

			<h3>Статистика движения</h3>
			<hr />
			<div className='infoSection'>
				<div className='infoBox'>
					<div className='headInfoBox'>Общее пройденное расстояние</div>
					<p>{robot.total_distance} км</p>
				</div>
				<div className='infoBox'>
					<div className='headInfoBox'>Среднее расстояние за задачу</div>
					<p>{robot.avg_distance_per_task} км</p>
				</div>
				<div className='infoBox'>
					<div className='headInfoBox'>Количество поездок</div>
					<p>{robot.trip_count}</p>
				</div>
			</div>

			<button className='closeButton' onClick={closeMoreRobotInfo}>
				X
			</button>
		</div>
	)
}
