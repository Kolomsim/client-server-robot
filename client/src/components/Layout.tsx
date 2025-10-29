import React from 'react'
import { NavBar } from './NavBar'

type LayoutProps = {
	children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
	return (
		<div className='pageContainer'>
			<div className='navigationBar'>
				<NavBar />
			</div>
			<div className='mainContent'>{children}</div>
		</div>
	)
}
