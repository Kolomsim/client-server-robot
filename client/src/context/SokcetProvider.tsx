import { createContext, useContext, useEffect, useRef, useState } from 'react'
import useAuth from '../hooks/useAuth'

type RobotData = Record<string, any>
export interface SocketContextType {
	sendMessage: (message: string | object) => void
	messages: any[]
	robotData: any | null
	statusSummary: Record<string, number>
}

const SocketContext = createContext<
	SocketContextType & { robotData: RobotData | null }
>({
	sendMessage: () => {},
	messages: [],
	robotData: null,
	statusSummary: {},
})

export const SocketProvider = ({ children }: { children: JSX.Element }) => {
	const { isAuthenticated, sessionId } = useAuth()
	const [messages, setMessages] = useState<any[]>([])
	const [robotData, setRobotData] = useState<RobotData | null>(null)
	const [statusSummary, setStatusSummary] = useState<Record<string, number>>({})

	const socketRef = useRef<WebSocket | null>(null)

	const apiBase =
		(import.meta as any).env.VITE_API_URL || 'http://localhost:8000'
	const wsBase =
		(import.meta as any).env.VITE_WS_URL || apiBase.replace(/^http/, 'ws')

	useEffect(() => {
		if (isAuthenticated && sessionId) {
			const socket = new WebSocket(`${wsBase}/ws?session_id=${sessionId}`)
			socketRef.current = socket

			socket.onopen = () => {
				console.log('✅ WebSocket открыт')
				const roleMessage = { role: 'operator', id: sessionId }
				socket.send(JSON.stringify(roleMessage))

				const pingInterval = setInterval(() => {
					if (socket.readyState === WebSocket.OPEN) {
						socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
					}
				}, 60000)

				return () => clearInterval(pingInterval)
			}

			socket.onmessage = e => {
				try {
					const data = JSON.parse(e.data)
					if (data.type === 'robot_status_summary') {
						setStatusSummary(data.statuses)
						setRobotData(prev => ({
							...prev,
							connectedRobots: data.connected_robots,
						}))
						return
					}
					if (data.type === 'pong') {
						return
					}
					setRobotData(prev => ({ ...prev, ...data }))
					setMessages(prev => [...prev, data])
				} catch (err) {
					console.warn('⚠️ Ошибка при парсинге JSON:', e.data)
				}
			}

			socket.onerror = e => console.error('❌ WebSocket ошибка:', e)
			socket.onclose = () => console.log('🔒 WebSocket закрыт')

			return () => {
				socket.close()
			}
		}
	}, [isAuthenticated, sessionId])

	const sendMessage = (msg: string | object) => {
		if (socketRef.current?.readyState === WebSocket.OPEN) {
			const message = typeof msg === 'string' ? msg : JSON.stringify(msg)
			socketRef.current.send(message)
		} else {
			console.warn('Сокет не готов для отправки')
		}
	}

	return (
		<SocketContext.Provider
			value={{ sendMessage, messages, robotData, statusSummary }}
		>
			{children}
		</SocketContext.Provider>
	)
}

export const useSocket = () => useContext(SocketContext)
