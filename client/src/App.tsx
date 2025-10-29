import useRoutes from './routes/routes'
import './App.css'

function App() {
	const routes = useRoutes()
	return <>{routes}</>
}

export default App
