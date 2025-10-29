export interface Measurement {
	lat: number
	lng: number
	humidity: number
	timestamp: string
}

export interface Task {
	taskId: number
	location: string
	startTime: string
	robot: string
	measurements: Measurement[]
}
