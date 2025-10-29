import useAuth from '../hooks/useAuth'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../src/config.ts'

export default function LoginPage() {
	const { setAuth } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const from = location.state?.from?.pathname || '/map'

	const [username, setUsername] = useState<string>('')
	const [password, setPassword] = useState<string>('')
	const [error, setError] = useState<string | null>(null)

	async function submitHandler(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setError(null)
		if (!username.trim() || !password.trim()) {
			setError('Пожалуйста, введите логин и пароль.')
			return
		}

		try {
			const response = await axios.post(
				`${API_BASE_URL}/create_session/`,
				{ username, password },
				{ withCredentials: true }
			)

			if (response.status === 200) {
				const sessionId = response.data.session_id
				setAuth(true, sessionId)
				navigate(from, { replace: true })
			}
		} catch (err) {
			setError('Ошибка входа. Проверьте логин и пароль.')
		}
	}

	return (
		<div id='loginFormContainer'>
			<form id='loginForm' onSubmit={submitHandler}>
				<label htmlFor='usernameField'>Логин</label>
				<input
					type='text'
					id='usernameField'
					name='usernameField'
					value={username}
					onChange={e => setUsername(e.target.value)}
				/>
				<label htmlFor='passwordField'>Пароль</label>
				<input
					type='password'
					id='passwordField'
					name='passwordField'
					value={password}
					onChange={e => setPassword(e.target.value)}
				/>
				{error && <p className='error-message'>{error}</p>}
				<button type='submit'>Войти</button>
			</form>
		</div>
	)
}
