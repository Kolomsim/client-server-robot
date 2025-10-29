import { useEffect, useState } from 'react'
import axios from 'axios'
import Layout from '../../components/Layout.tsx'
import RobotCard from '../../components/RobotInfoCard.tsx'
import MoreInfoCard from '../../components/MoreRobotInfo.tsx'
import FocusBackground from '../../components/FocusBackground.tsx'
import NewRobotForm from '../../components/NewRobotForm.tsx'
import { useSocket } from '../../context/SokcetProvider.tsx'
import { Robot, RobotStatus } from '../../models/robot.tsx'
import './robots.css'
import { API_BASE_URL } from '../../../src/config.ts'

export default function RobotsPage() {
	const [robots, setRobots] = useState<Robot[]>([])
	const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null)
	const [isMoreInfoActive, setIsMoreInfoActive] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState(true)
	const { robotData } = useSocket()

	useEffect(() => {
		const fetchRobots = async () => {
			try {
				setIsLoading(true)
				const response = await axios.get(`${API_BASE_URL}/robots/`)
				const robotsFromDB = response.data.robots || []

				const updatedRobots = robotsFromDB.map((robot: Robot) => ({
					...robot,
					status: RobotStatus.BROKEN_CONNECT,
					lastUpdated: 0,
					deviceName: robot.deviceName || `Robot ${robot.robot_id}`,
					camera_ok: robot.camera_ok || 'OK',
					lidar_ok: robot.lidar_ok || 'OK',
					current_voltage: robot.current_voltage || 0,
					cpu_frequency: robot.cpu_frequency || 0,
					cpu_usage: robot.cpu_usage || 0,
					memory_usage: robot.memory_usage || 0,
					total_distance: robot.total_distance || 0,
					avg_distance_per_task: robot.avg_distance_per_task || 0,
					trip_count: robot.trip_count || 0,
					picture_url: robot.picture_url || '/default_robot.jpg',
					lat: robot.lat || 0,
					lng: robot.lng || 0,
				}))

				setRobots(updatedRobots)
			} catch (error) {
				console.error('Ошибка при загрузке роботов:', error)
			} finally {
				setIsLoading(false)
			}
		}

		fetchRobots()
	}, [])

	useEffect(() => {
		if (robotData) {
			setRobots(prevRobots => {
				const existingRobotIndex = prevRobots.findIndex(
					r => String(r.robot_id) === String(robotData.robot_id)
				)

				const newRobot: Robot = {
					robot_id: Number(robotData.robot_id),
					deviceName: robotData.deviceName || `Robot ${robotData.robot_id}`,
					status: robotData.status || 'не в сети',
					lastUpdated: Date.now(),
					camera_ok: robotData.camera_ok || 'OK',
					lidar_ok: robotData.lidar_ok || 'OK',
					current_voltage: robotData.current_voltage || 0,
					cpu_frequency: robotData.cpu_frequency || 0,
					cpu_usage: robotData.cpu_usage || 0,
					memory_usage: robotData.memory_usage || 0,
					total_distance: robotData.total_distance || 0,
					avg_distance_per_task: robotData.avg_distance_per_task || 0,
					trip_count: robotData.trip_count || 0,
					picture_url: robotData.picture_url || '/default_robot.jpg',
					lat: robotData.coordinates?.lat || 0,
					lng: robotData.coordinates?.lng || 0,
				}

				if (existingRobotIndex !== -1) {
					const updatedRobots = prevRobots.map((r, i) =>
						i === existingRobotIndex ? { ...r, ...newRobot } : r
					)

					if (selectedRobot?.robot_id === newRobot.robot_id) {
						setSelectedRobot(newRobot)
					}

					return updatedRobots
				}

				return [...prevRobots, newRobot]
			})
		}
	}, [robotData, selectedRobot])

	useEffect(() => {
		const interval = setInterval(() => {
			setRobots(prev =>
				prev.map(robot => {
					if (
						robot.status === RobotStatus.AVAILABLE &&
						Date.now() - robot.lastUpdated > 10000
					) {
						return { ...robot, status: RobotStatus.BROKEN_CONNECT }
					}
					return robot
				})
			)
		}, 5000)

		return () => clearInterval(interval)
	}, [])

	function openMoreInfo(id: number) {
		const robot = robots.find(r => r.robot_id === id)
		if (robot) {
			setSelectedRobot(robot)
			setIsMoreInfoActive(true)
		}
	}

	function closeMoreInfo() {
		setSelectedRobot(null)
		setIsMoreInfoActive(false)
	}

	console.log('selected robot: ', selectedRobot)

	return (
		<Layout>
			<FocusBackground
				isActive={isMoreInfoActive}
				setIsActive={closeMoreInfo}
			/>

			<div className='cardContainer'>
				{isLoading ? (
					<p>Загрузка роботов...</p>
				) : robots.length > 0 ? (
					robots.map(robot => (
						<RobotCard
							key={robot.robot_id}
							robot={robot}
							openMoreRobotInfo={openMoreInfo}
							robotStatus={robotData?.status}
						/>
					))
				) : (
					<p>Нет доступных роботов</p>
				)}

				{selectedRobot && (
					<MoreInfoCard
						index={selectedRobot.robot_id}
						robotData={selectedRobot}
						setIsActive={closeMoreInfo}
						isActive={isMoreInfoActive}
					/>
				)}
			</div>

			<NewRobotForm />
		</Layout>
	)
}
