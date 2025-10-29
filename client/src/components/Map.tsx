import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSocket } from '../context/SokcetProvider.tsx'

// Создание иконки для маркера робота в виде точки (с инлайн-стилями)
const createRobotIcon = () =>
	L.divIcon({
		className: 'robot-marker',
		html: `
					<div style="
							width: 10px;
							height: 10px;
							background-color: red;
							border-radius: 50%;
							box-shadow: 0 0 5px rgba(255, 0, 0, 0.7);
					"></div>
			`,
		iconSize: [10, 10],
		iconAnchor: [5, 5],
	})

interface MapProps {
	lat: number
	lng: number
	usedInTaskForm: boolean
	onMapClick?: (lat: number, lng: number) => void
	points?: { lat: number; lng: number }[]
	onMarkerClick?: (index: number) => void
	createMarkerIcon?: (index: number) => L.DivIcon
}

function Map({
	lat,
	lng,
	usedInTaskForm,
	onMapClick,
	points,
	onMarkerClick,
	createMarkerIcon,
}: MapProps) {
	const [mapLat, setMapLat] = useState(lat)
	const [mapLng, setMapLng] = useState(lng)

	const { robotData } = useSocket()

	const location = useLocation()

	useEffect(() => {
		const queryParams = new URLSearchParams(location.search)
		const latFromUrl = queryParams.get('lat')
		const lngFromUrl = queryParams.get('lng')

		if (latFromUrl && lngFromUrl) {
			setMapLat(parseFloat(latFromUrl))
			setMapLng(parseFloat(lngFromUrl))
		}
	}, [location.search])

	function ClickHandler({
		onMapClick,
	}: {
		onMapClick: (lat: number, lng: number) => void
	}) {
		useMapEvents({
			click(e) {
				onMapClick(e.latlng.lat, e.latlng.lng)
			},
		})
		return null
	}

	return (
		<MapContainer
			center={[mapLat, mapLng]}
			zoom={17}
			scrollWheelZoom={true}
			attributionControl={false}
			style={{ height: '100%', width: '100%' }}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>  contributors'
				url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
			/>

			{usedInTaskForm && onMapClick && <ClickHandler onMapClick={onMapClick} />}

			{points?.map((point, index) => (
				<Marker
					key={index}
					position={[point.lat, point.lng]}
					icon={createMarkerIcon ? createMarkerIcon(index + 1) : undefined}
					eventHandlers={{
						click: () => onMarkerClick?.(index),
					}}
				/>
			))}

			{/* Маркер робота */}
			{robotData?.coordinates?.lat && robotData?.coordinates?.lng && (
				<Marker
					position={[
						parseFloat(robotData.coordinates.lat as any),
						parseFloat(robotData.coordinates.lng as any),
					]}
					icon={createRobotIcon()}
				>
					<Popup>
						<b>{robotData.deviceName || 'Робот'}</b> <br />
						Широта: {robotData.coordinates.lat}, Долгота:{' '}
						{robotData.coordinates.lng}
					</Popup>
				</Marker>
			)}
		</MapContainer>
	)
}

export default Map
