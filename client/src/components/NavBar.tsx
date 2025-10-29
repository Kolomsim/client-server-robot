import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import axios from 'axios'

export const NavBar = React.memo(() => {
	const { setAuth } = useAuth()
	const navigate = useNavigate()

	const apiBase =
		(import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

	const logoutHandler = async () => {
		try {
			await axios.post(
				`${apiBase}/delete_session`,
				{},
				{
					withCredentials: true,
				}
			)
			localStorage.clear()
			setAuth(false)
			navigate('/login')
		} catch (error) {
			console.error('Ошибка при выходе:', error)
		}
	}

	return (
		<header className='header'>
			<h1>Меню</h1>
			<nav>
				<Link to='/map'>
					<div className='headerLink'>
						<img src='/icons/mapPage.png' />
						<p>Карта</p>
					</div>
				</Link>

				<Link to='/activities'>
					<div className='headerLink'>
						<img src='/icons/activityPage.png' />
						<p>Маршруты</p>
					</div>
				</Link>

				<Link to='/data'>
					<div className='headerLink'>
						<img src='/icons/dataPage.png' />
						<p>Данные</p>
					</div>
				</Link>

				<Link to='/devices'>
					<div className='headerLink'>
						<img src='/icons/robotPage.png' />
						<p>Роботы</p>
					</div>
				</Link>
				<Link to='/login'>
					<div
						className='headerLink'
						style={{ cursor: 'pointer' }}
						onClick={logoutHandler}
					>
						<img src='/icons/logoutPage.png' />
						<p>Выход</p>
					</div>
				</Link>
			</nav>
		</header>
	)
})
