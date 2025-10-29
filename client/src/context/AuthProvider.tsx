import { createContext, useEffect, useState } from 'react'

type AuthContextType = {
	isAuthenticated: boolean
	sessionId: string | null
	setAuth: (auth: boolean, sessionId?: string) => void
}

const AuthContext = createContext<AuthContextType>({
	isAuthenticated: false,
	sessionId: null,
	setAuth: () => {},
})

export const AuthProvider = ({ children }: { children: JSX.Element }) => {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
		return localStorage.getItem('isAuthenticated') === 'true'
	})
	const [sessionId, setSessionId] = useState<string | null>(() => {
		return localStorage.getItem('sessionId')
	})

	useEffect(() => {
		if (isAuthenticated && sessionId) {
		}
	}, [isAuthenticated, sessionId])

	const setAuth = (auth: boolean, sessionId?: string) => {
		setIsAuthenticated(auth)
		localStorage.setItem('isAuthenticated', String(auth))

		if (auth && sessionId) {
			setSessionId(sessionId)
			localStorage.setItem('sessionId', sessionId)
		} else {
			setSessionId(null)
			localStorage.removeItem('sessionId')
			localStorage.setItem('isAuthenticated', 'false')
		}
	}

	return (
		<AuthContext.Provider value={{ isAuthenticated, sessionId, setAuth }}>
			{children}
		</AuthContext.Provider>
	)
}

export default AuthContext
