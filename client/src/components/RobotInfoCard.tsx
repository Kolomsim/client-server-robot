import { useEffect } from 'react'
import { Robot, RobotStatus } from '../models/robot.tsx'
import { StatusColorChange } from '../utils/changeColorStatus.ts'

interface RobotCardProps {
	openMoreRobotInfo: (id: number) => void
	robot: Robot
	robotStatus: keyof typeof RobotStatus // Сделаем необязательным, если данные могут отсутствовать
}

export default function RobotCard({
	robot,
	openMoreRobotInfo,
	robotStatus,
}: RobotCardProps) {
	const status = robotStatus || robot.status

	const charge = 50

	const getBatteryClass = (level: number): string => {
		if (level <= 20) return 'low-charge'
		if (level <= 60) return 'medium-charge'
		return 'high-charge'
	}

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
	}, [status])

	function getStatusClass(currentStatus: RobotStatus): string {
		switch (currentStatus) {
			case RobotStatus.AVAILABLE:
			case RobotStatus.CHARGING:
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

	const finalStatus = RobotStatus[status as keyof typeof RobotStatus]

	return (
		<div
			id={`${robot.robot_id}`}
			className={`robotsInfoCard ${getStatusClass(finalStatus)}`}
		>
			<div className='nameAndPhotoBlock'>
				<img src='../../public/robologo.jpg' alt='Робот' />
				<div className='textBlock'>
					<p id='tobotName'>{robot.deviceName}</p>
					<p id={`${robot.robot_id}`} className='robotStatus'>
						{getStatusText(finalStatus)}
					</p>
				</div>
			</div>
			<div className='battery-status' data-charge={charge}>
				<img src='icons/zap.png' alt='Иконка батареи' />
				<div className='battery-bar'>
					<div
						className={`battery-level ${getBatteryClass(charge)}`}
						style={{ width: `${charge}%` }}
					></div>
				</div>
				<p className='battery-text'>{charge}%</p>
			</div>
			<button
				id='moreInfoButton'
				onClick={() => openMoreRobotInfo(robot.robot_id)}
			>
				показать больше
			</button>
		</div>
	)
}
