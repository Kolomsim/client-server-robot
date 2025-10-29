import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { useState } from 'react'
import { Task } from '../../src/types/Task.ts'
import '../pages/data/data.css'

interface MoreTaskInfoProps {
	index: number | null
	setIsActive: (active: boolean) => void
	isActive: boolean
	task: Task
}

export default function MoreTaskInfo({
	index,
	setIsActive,
	isActive,
	task,
}: MoreTaskInfoProps) {
	function closeMoreInfo() {
		setIsActive(false)
	}

	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

	const createMarkerIcon = (isHighlighted: boolean) => {
		return L.divIcon({
			className: 'custom-marker',
			html: `<div style="background-color: ${
				isHighlighted ? 'green' : 'orange'
			}; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${
				isHighlighted ? 'X' : 'O'
			}</div>`,
		})
	}

	return (
		<div
			key={index}
			id='taskMoreInfoCard'
			className={`taskForm ${isActive ? 'opened' : 'closed'}`}
		>
			<div className='modalFormTask'>
				<button className='closeButton' onClick={() => closeMoreInfo()}>
					X
				</button>
				<h2>Измерения влажности</h2>

				<div className='infoContainer'>
					<div className='mapContainer'>
						<MapContainer
							center={[52.021273475816855, 47.771636785181634]}
							zoom={10}
							className='map'
							attributionControl={false}
						>
							<TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
							{task.measurements.map((m, index) => (
								<Marker
									key={index}
									position={[m.lat, m.lng]}
									icon={createMarkerIcon(hoveredIndex === index)}
								/>
							))}
						</MapContainer>
					</div>
					<table>
						<thead>
							<tr>
								<th>Координаты</th>
								<th>Влажность</th>
								<th>Дата</th>
							</tr>
						</thead>
						<tbody>
							{task.measurements.map((m, index) => (
								<tr
									key={index}
									className={hoveredIndex === index ? 'highlightRow' : ''}
									onMouseEnter={() => setHoveredIndex(index)}
									onMouseLeave={() => setHoveredIndex(null)}
								>
									<td>
										[{m.lat.toFixed(5)}, {m.lng.toFixed(5)}]
									</td>
									<td>{m.humidity}%</td>
									<td>{new Date(m.timestamp).toLocaleString()}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}
