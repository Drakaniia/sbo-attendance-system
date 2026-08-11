import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppRouter from './lib/app-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface ReactRootElement extends HTMLElement {
	_reactRoot?: ReturnType<typeof createRoot>;
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Keep data fresh for 30 seconds — avoids re-fetching on every
			// mount/focus while still feeling responsive.
			staleTime: 30_000,
			// Retry once (not 3 times) with a 2s delay so transient SQLite
			// lock contention doesn't burn through all attempts.
			retry: 1,
			retryDelay: 2_000,
		},
	},
});
const rootElement = document.getElementById('root') as ReactRootElement;

const root = rootElement._reactRoot ?? createRoot(rootElement);
rootElement._reactRoot = root;

root.render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<AppRouter />
		</QueryClientProvider>
	</StrictMode>
);

