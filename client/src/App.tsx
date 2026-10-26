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
		<main className="relative flex h-screen overflow-hidden">
			<Sidebar />

			<section className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-none">
				<div className="mx-auto w-full max-w-[1520px] px-6 pb-16 pt-6 lg:px-10">
					<Outlet />
				</div>
			</section>
		</main>
	);
}

export default App;
