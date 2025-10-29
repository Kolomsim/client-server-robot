import { useState, useEffect } from 'react'
import L from 'leaflet'
import Map from './Map.tsx'
import { Robot, ROBOT_LIST, TaskType } from '../models/robot.tsx'
import axios from 'axios'
import { API_BASE_URL } from '../config.ts'

const robots_arr: Robot[] = ROBOT_LIST
const taskTypeMap = Object.entries(TaskType)

type TaskFormProps = {
	setIsActive: (active: boolean) => void
	isActive: boolean
	onAddTask: (newTask: any) => void
}

export default function TaskForm({
	isActive,
	setIsActive,
	onAddTask,
}: TaskFormProps) {
	const [selectedPoints, setSelectedPoints] = useState<
		{ lat: number; lng: number }[]
	>([])
	const [selectedRobot, setSelectedRobot] = useState<string>('')
	const [selectedTask, setSelectedTask] = useState<string>('')
	const [selectedRoute, setSelectedRoute] = useState<string>('')

	const handleAddPoint = (lat: number, lng: number) => {
		setSelectedPoints(prevPoints => [...prevPoints, { lat, lng }])
		setSelectedRoute('')
	}

	const handleRemovePoint = (index: number) => {
		setSelectedPoints(prevPoints => prevPoints.filter((_, i) => i !== index))
	}

	const closeTaskForm = () => {
		setIsActive(false)
	}

	const handleSubmit = () => {
		const newTask = {
			points: selectedPoints,
			robot: selectedRobot,
			task: selectedTask,
		}

		console.log('Отправляемая задача:', newTask)

		onAddTask(newTask)

		setSelectedPoints([])
		setSelectedRobot('')
		setSelectedTask('')
		setSelectedRoute('')
		setIsActive(false)
	}

	const createMarkerIcon = (index: number) => {
		return L.divIcon({
			className: 'custom-marker',
			html: `<div style="background-color: red; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${index}</div>`,
		})
	}

	const [savedRoutes, setSavedRoutes] = useState<any[]>([])

	const fetchRoutes = async () => {
		try {
			const response = await axios.get(`${API_BASE_URL}/routes/`)
			const data = response.data
			if (Array.isArray(data)) {
				setSavedRoutes(data)
			} else if (Array.isArray(data.routes)) {
				setSavedRoutes(data.routes)
			} else {
				console.error('Некорректный формат данных маршрутов:', data)
				setSavedRoutes([])
			}
		} catch (error) {
			console.error('Ошибка при загрузке маршрутов:', error)
			setSavedRoutes([])
		}
	}
	useEffect(() => {
		fetchRoutes()
	}, [])

	const saveRoute = async (coordinates: { lat: number; lng: number }[]) => {
		try {
			const response = await axios.post(`${API_BASE_URL}/routes/`, {
				name: 'Маршрут ' + new Date().toLocaleString(),
				coordinates: coordinates,
			})
			console.log('Маршрут сохранён:', response.data)
			await fetchRoutes()
		} catch (error) {
			console.error('Ошибка при сохранении маршрута:', error)
		}
	}

	const handleRouteSelect = async (routeId: string) => {
		setSelectedRoute(routeId)
		const route = savedRoutes.find(route => route.route_id === routeId)
		if (route && route.coordinates) {
			setSelectedPoints(route.coordinates)
		}
	}

	return (
		<div id='taskForm' className={`taskForm ${isActive ? 'opened' : 'closed'}`}>
			<button className='closeButton' onClick={closeTaskForm}>
				X
			</button>

			<div className='mapContainerTask'>
				<Map
					lat={52.021273475816855}
					lng={47.771636785181634}
					usedInTaskForm={true}
					points={selectedPoints}
					onMapClick={handleAddPoint}
					onMarkerClick={handleRemovePoint}
					createMarkerIcon={createMarkerIcon}
				/>
			</div>

			<div className='taskParams'>
				<select
					className='taskParams__select'
					value={selectedRobot}
					onChange={e => setSelectedRobot(e.target.value)}
				>
					<option value=''>Выберите робота</option>
					{robots_arr.map((robot, id) => (
						<option key={id} value={robot.deviceName}>
							{robot.deviceName}
						</option>
					))}
				</select>

				<div className='routeSelectWrapper'>
					<select
						className='taskParams__select'
						value={selectedRoute}
						onChange={e => handleRouteSelect(e.target.value)}
					>
						<option value=''>Выберите маршрут</option>
						{savedRoutes.map((route, id) => (
							<option key={id} value={route.route_id}>
								{route.name}
							</option>
						))}
					</select>

					<button
						onClick={() => saveRoute(selectedPoints)}
						className='btnStandart'
					>
						Сохранить маршрут
					</button>
				</div>

				<select
					className='taskParams__select'
					value={selectedTask}
					onChange={e => setSelectedTask(e.target.value)}
				>
					<option value=''>Выберите задачу</option>
					{taskTypeMap.map(([key, value]) => (
						<option key={key} value={key}>
							{value}
						</option>
					))}
				</select>

				<button className='btnStandart' onClick={handleSubmit}>
					Отправить
				</button>
			</div>
		</div>
	)
}
