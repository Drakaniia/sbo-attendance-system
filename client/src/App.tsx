import '@mantine/core/styles.css';
import { useEffect } from 'react';
import { emit } from '@tauri-apps/api/event';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { setNavigate } from './lib/navigate';

function App() {
	const navigate = useNavigate();
	setNavigate(navigate);

	useEffect(() => {
		if (typeof (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ === 'undefined') {
			return;
		}

		// The shell has committed. The native splash can now fade away without
		// exposing an unpainted or black main window.
		emit('frontend-ready').catch(() => {
			// Rust still has a startup safety fallback if the event bridge fails.
		});
	}, []);

	return (
		<main className="flex h-screen">
			<Sidebar />

			<section className="min-w-0 flex-1 overflow-y-scroll overscroll-none overflow-x-hidden bg-[#0A0A0A] p-5">
				<Outlet />
			</section>
		</main>
	);
}

export default App;
