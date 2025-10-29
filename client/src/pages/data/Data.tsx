import { useState, useEffect } from 'react'
import axios from 'axios'
import FilterPanel from '../../components/FilterField'
import { FilterField } from '../../types/Filter'
import FocusBackground from '../../components/FocusBackground'
import Layout from '../../components/Layout'
import MoreInfoCard from '../../components/TaskInfoTable'
import { Task } from '../../types/Task'
import '../data/data.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const fields: FilterField[] = [
	{ key: 'location', label: 'Локация', type: 'text' },
	{
		key: 'robot',
		label: 'Робот',
		type: 'select',
		options: ['Transbot', 'Transbot2'],
	},
	{ key: 'startTime', label: 'Диапазон дат', type: 'dateRange' },
]

export default function DataPage() {
	const [selectedTask, setSelectedTask] = useState<number | null>(null)
	const [isMoreInfoActive, setIsMoreInfoActive] = useState<boolean>(false)
	const [filters, setFilters] = useState<Record<string, any>>({})
	const [tasks, setTasks] = useState<Task[]>([])
	const [isLoading, setIsLoading] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchTasks = async () => {
			try {
				setIsLoading(true)
				const response = await axios.get(`${API_URL}/tasks/`, {
					params: filters,
				})
				console.log('Ответ сервера:', response.data)

				if (Array.isArray(response.data)) {
					setTasks(response.data)
				} else if (Array.isArray(response.data.tasks)) {
					setTasks(response.data.tasks)
				} else {
					throw new Error('Некорректный формат данных от сервера')
				}

				setError(null)
			} catch (err) {
				console.error('Ошибка при загрузке задач:', err)
				setError('Не удалось загрузить данные')
				setTasks([])
			} finally {
				setIsLoading(false)
			}
		}

		fetchTasks()
	}, [filters])

	// Загрузка деталей задачи
	const fetchTaskDetails = async (taskId: number) => {
		try {
			const response = await axios.get(`${API_URL}/tasks/${taskId}/`)
			return response.data
		} catch (err) {
			console.error('Ошибка при загрузке деталей задачи:', err)
			throw err
		}
	}

	async function openMoreInfo(id: number) {
		try {
			setIsLoading(true)
			const taskDetails = await fetchTaskDetails(id)
			setSelectedTask(taskDetails.taskId)
			setIsMoreInfoActive(true)
		} catch (err) {
			setError('Не удалось загрузить детали задачи')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Layout>
			<FocusBackground
				isActive={isMoreInfoActive}
				setIsActive={setIsMoreInfoActive}
			/>
			<FilterPanel fields={fields} onFilterChange={setFilters} />

			{isLoading && <div className='loading'>Загрузка...</div>}
			{error && <div className='error'>{error}</div>}

			{Array.isArray(tasks) && tasks.length > 0 ? (
				<table className='tasksTable'>
					<thead>
						<tr>
							<th>Местность</th>
							<th>Робот</th>
							<th>Дата начала</th>
							<th>Дата завершения</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{tasks.map(task => (
							<tr key={task.taskId}>
								<td>{task.location}</td>
								<td>{task.robot}</td>
								<td>{new Date(task.startTime).toLocaleString()}</td>
								<td>
									{task.endTime
										? new Date(task.endTime).toLocaleString()
										: 'В процессе'}
								</td>
								<td>
									<button
										className='btnStandart'
										onClick={() => openMoreInfo(task.taskId)}
										disabled={isLoading}
									>
										{isLoading && selectedTask === task.taskId
											? 'Загрузка...'
											: 'Подробнее'}
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			) : !isLoading && !error ? (
				<div className='info'>Нет доступных задач</div>
			) : null}

			{isMoreInfoActive && selectedTask !== null && (
				<MoreInfoCard
					index={selectedTask}
					setIsActive={setIsMoreInfoActive}
					isActive={isMoreInfoActive}
					task={tasks.find(t => t.taskId === selectedTask)!}
				/>
			)}
		</Layout>
	)
}
