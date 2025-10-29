import axios from 'axios'
import { useEffect, useState } from 'react'

import Layout from '../../components/Layout.tsx'
import TaskForm from '../../components/TaskForm.tsx'
import ActivityCard from '../../components/ActivityCard.tsx'
import { Robot } from '../../models/robot.tsx'
import FocusBackground from '../../components/FocusBackground.tsx'
import { useSocket } from '../../context/SokcetProvider.tsx'

import './activity.css'

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

type Task = {
	id: number
	robot_id: number
	task: string
	points: { lat: number; lng: number }[]
	autoRestart: boolean
	progress?: number
	start_time?: string
}

export default function ActivitiesPage() {
	const [isActivityFormActive, setIsActivityFormActive] = useState(false)
	const [activeTasks, setActiveTasks] = useState<Task[]>([])
	const [robots, setRobots] = useState<Robot[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const { robotData } = useSocket()

	useEffect(() => {
		if (robotData) {
			console.log('📡 Данные робота:', robotData)
			if (robotData.type === 'progress') {
				setActiveTasks(prevTasks =>
					prevTasks.map(task =>
						task.id === robotData.task_id
							? { ...task, progress: robotData.progress }
							: task
					)
				)
			}
		}
	}, [robotData])

	// Загрузка роботов из базы
	useEffect(() => {
		const fetchRobots = async () => {
			try {
				const response = await axios.get(`${API_URL}/robots/`)
				setRobots(response.data.robots || [])
			} catch (error) {
				console.error('Ошибка при загрузке роботов:', error)
			}
		}
		fetchRobots()
	}, [])

	// Загрузка задач — только после загрузки роботов
	useEffect(() => {
		if (robots.length === 0) return

		const loadTasks = async () => {
			setIsLoading(true)
			try {
				const tasks = await fetchTasks()
				setActiveTasks(tasks)
			} catch (error) {
				console.error('Ошибка при загрузке задач:', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadTasks()
	}, [robots])

	// Функция загрузки задач с сервера
	const fetchTasks = async (): Promise<Task[]> => {
		const response = await axios.get(`${API_URL}/tasks/`)
		const tasksFromServer = response.data.tasks

		if (!Array.isArray(tasksFromServer)) {
			console.warn('Получен некорректный формат данных:', tasksFromServer)
			return []
		}

		return tasksFromServer.map((task: any) => ({
			id: task.task_id,
			robot_id: task.robot_id,
			task: task.description || 'Без описания',
			points: task.coordinates || [],
			autoRestart: false,
			progress: task.progress || 0,
			start_time: task.start_time,
		}))
	}

	const addTaskToActive = async (newTask: Omit<Task, 'id' | 'progress'>) => {
		try {
			// Создаём маршрут
			const routeResponse = await axios.post(`${API_URL}/routes/`, {
				name: 'Маршрут ' + new Date().toLocaleString(),
				coordinates: newTask.points,
			})
			const route_id = routeResponse.data.route_id

			// Находим робота
			const robot = robots.find(r => r.id === newTask.robot_id)
			const robot_id = robot?.id || 1

			// Создаём задачу
			const taskResponse = await axios.post(`${API_URL}/tasks/`, {
				route_id,
				robot_id,
				description: newTask.task,
				start_time: new Date().toISOString(),
			})

			// Обновляем список активных задач
			const newTaskWithId: Task = {
				id: taskResponse.data.task_id,
				robot_id: robot_id,
				task: newTask.task,
				points: newTask.points,
				autoRestart: newTask.autoRestart,
				progress: 0,
			}
			setActiveTasks(prev => [...prev, newTaskWithId])
			setIsActivityFormActive(false)
		} catch (error) {
			console.error('Ошибка при создании задачи:', error)
		}
	}

	return (
		<Layout>
			<FocusBackground
				isActive={isActivityFormActive}
				setIsActive={setIsActivityFormActive}
			/>

			<div id='activitiesContent'>
				<div className='cardContainer'>
					{isLoading ? (
						<p>Загрузка задач...</p>
					) : activeTasks.length > 0 ? (
						activeTasks.map(task => {
							const robot = robots.find(r => r.robot_id === task.robot_id)
							return (
								<ActivityCard
									key={task.id}
									robot={robot || null}
									task={task}
									progress={task.progress || 0}
								/>
							)
						})
					) : (
						<p>Нет активных задач</p>
					)}
				</div>
			</div>

			<button
				className='createActivity'
				onClick={() => setIsActivityFormActive(true)}
			>
				+
			</button>

			<TaskForm
				setIsActive={setIsActivityFormActive}
				isActive={isActivityFormActive}
				onAddTask={addTaskToActive}
			/>
		</Layout>
	)
}
