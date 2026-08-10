import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppRouter from './lib/AppRouter';
import SplashGuard from './components/SplashGuard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface ReactRootElement extends HTMLElement {
	_reactRoot?: ReturnType<typeof createRoot>;
}

export const queryClient = new QueryClient();
const rootElement = document.getElementById('root') as ReactRootElement;

const root = rootElement._reactRoot ?? createRoot(rootElement);
rootElement._reactRoot = root;

root.render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<SplashGuard>
				<AppRouter />
			</SplashGuard>
		</QueryClientProvider>
	</StrictMode>
);
