import { Outlet, useLocation, Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.tsx'

export const PrivateRoute = () => {
	const { isAuthenticated } = useAuth()
	const location = useLocation()

	return isAuthenticated === true ? (
		<Outlet />
	) : (
		<Navigate to='/login' state={{ from: location }} replace />
	)
}
