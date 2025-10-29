import { Route, Routes } from 'react-router-dom'
import { PrivateRoute } from '../components/PrivateRoute.tsx'
import { pagesRoutes } from './routesEnum.ts'

import Login from '../pages/Login.tsx'
import Data from '../pages/data/Data.tsx'
import Map from '../pages/Map.tsx'
import Robots from '../pages/robots/Robots.tsx'
import ActivitiesPage from '../pages/activity/Activities.tsx'

export default function useRoutes() {
	return (
		<Routes>
			<Route path={`/${pagesRoutes.LOGIN}`} element={<Login />} />

			<Route element={<PrivateRoute />}>
				<Route path={`/`} element={<Login />} />
				<Route index path={`/${pagesRoutes.MAP}`} element={<Map />} />
				<Route
					path={`/${pagesRoutes.ACTIVITIES}`}
					element={<ActivitiesPage />}
				/>
				<Route path={`/${pagesRoutes.DEVICES}`} element={<Robots />} />
				<Route path={`/${pagesRoutes.DATA}`} element={<Data />} />
			</Route>
		</Routes>
	)
}
