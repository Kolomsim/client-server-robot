import React from 'react'
import { TaskType } from '../models/robot'

interface ActivityCardProps {
	robot: any
	task: {
		points: { lat: number; lng: number }[]
		task: string
		autoRestart: boolean
	}
	progress: number
}

export default function ActivityCard({
	robot,
	task,
	progress,
}: ActivityCardProps) {
	if (!robot || !Array.isArray(task.points)) {
		return <div>Ошибка загрузки задачи</div>
	}

	return (
		<div className='activityCard'>
			<div className='activityInfoBlock'>
				<img src='pole.jpg' alt='Сектор выполнения'></img>
				<div className='textBlock'>
					<div>
						<p id='sectorName'>Место выполнения: сектор №1</p>
						<p id='robotName'>Выполняет: {robot.deviceName}</p>
						<p>Задача: {TaskType[task.task]}</p>
						<p id='date-start'>Начало выполнения: {task.start_time}</p>
					</div>
				</div>
			</div>
			<div
				className='progressBar'
				role='progressbar'
				aria-valuenow={progress}
				aria-valuemin={0}
				aria-valuemax={100}
				style={
					{
						'--progress-value': `${progress}%`,
					} as React.CSSProperties
				}
			></div>
		</div>
	)
}
