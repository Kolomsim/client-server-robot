import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { SocketProvider } from './context/SokcetProvider'
import App from './App'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
	<React.StrictMode>
		<Router>
			<AuthProvider>
				<SocketProvider>
					<App />
				</SocketProvider>
			</AuthProvider>
		</Router>
	</React.StrictMode>
)
