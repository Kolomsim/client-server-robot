import { useContext } from 'react'
import AuthContext from '../context/AuthProvider.tsx'

export default function useAuth() {
	return useContext(AuthContext)
}
