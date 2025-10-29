export enum RobotStatus {
	AVAILABLE = 'в сети',
	CHARGING = 'заряжается',
	IN_OPERATION = 'в работе',
	BROKEN_CONNECT = 'не в сети',
}

export enum TaskType {
	SOIL_DETERMENATION = 'определение влажности почвы',
	MAINTENANCE = 'обслуживание',
	SURVEILLANCE = 'наблюдение',
}

export type Robot = {
	robot_id: number
	deviceName: string
	status: RobotStatus
	camera_ok: string
	lidar_ok: string
	picture_url?: string
	current_voltage: number // Текущее напряжение на батарее (В)
	cpu_frequency: number // Частота процессора (МГц)
	cpu_usage: number
	memory_usage: number // Использование оперативной памяти (МБ)
	total_distance: number // Общее пройденное расстояние (км)
	avg_distance_per_task: number // Среднее расстояние за одну задачу (км)
	trip_count: number // Количество поездок
	lat: number // Широта
	lng: number // Долгота
	lastUpdated: number // Время последнего обновления данных
}

export const ROBOT_LIST: Robot[] = Array.from({ length: 1 }, _ => {
	return {
		robot_id: 0,
		deviceName: 'Transbot', //robot
		status: RobotStatus.BROKEN_CONNECT, //robot
		picture_url: 'robologo.jpg',
		camera_ok: 'Не подключено',
		lidar_ok: 'Не подключено',
		current_voltage: 0, //robot
		cpu_frequency: 0,
		cpu_usage: 0,
		memory_usage: 0,
		data_exchange_latency: 0, //robot
		self_diagnosis_status: 'Неизвестно', //tobot
		total_distance: 0, //database
		avg_distance_per_task: 0, //database
		trip_count: 0, //database
		lat: 0, //robot
		lng: 0, //robot
		lastUpdated: 0, // Время последнего обновления данных
	}
})
