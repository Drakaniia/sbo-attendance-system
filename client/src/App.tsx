import '@mantine/core/styles.css';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { setNavigate } from './lib/navigate';

function App() {
	const navigate = useNavigate();
	setNavigate(navigate);

	return (
		<main className='flex h-screen'>
			<Sidebar />

			<section className='min-w-0 flex-1 overflow-y-scroll overscroll-none overflow-x-hidden bg-[#0A0A0A] p-5'>
				<Outlet />
			</section>
		</main>
	);
}

export default App;
