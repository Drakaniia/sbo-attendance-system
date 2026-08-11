import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '../App';
import { MantineProvider } from '@mantine/core';
import Dashboard from '../pages/Dashboard/index';
import Attendance from '../pages/Attendance';
import UploadStudents from '../pages/UploadStudents';
import { useThemeStore } from '../store/theme';
import { NotificationProvider } from '../hooks/useNotification';
import Events from '../pages/Events';
import Students from '../pages/Students';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings/index';
import SingleEvent from '../pages/SingleEvent/index';

export default function AppRouter() {
	const theme = useThemeStore((state) => state.theme);

	const route = createBrowserRouter([
		{
			path: '/',
			element: <App />,
			children: [
				{
					index: true,
					element: <Dashboard />,
				},
				{
					path: '/admin/dashboard',
					element: <Dashboard />,
				},
				{
					path: '/admin/events',
					element: <Events />,
				},
				{
					path: '/admin/events/:eventID',
					element: <SingleEvent />,
				},
				{
					path: '/admin/attendance',
					element: <Attendance />,
				},
				{
					path: '/admin/students',
					element: <Students />,
				},
				{
					path: '/admin/reports',
					element: <Reports />,
				},
				{
					path: '/admin/settings',
					element: <Settings />,
				},
				{
					path: '/upload-students',
					element: <UploadStudents />,
				},
			],
		},
	]);

	return (
		<MantineProvider forceColorScheme={theme}>
			<NotificationProvider>
				<RouterProvider router={route} />
			</NotificationProvider>
		</MantineProvider>
	);
}
