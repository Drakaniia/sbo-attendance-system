import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_HEALTH_URL = 'http://127.0.0.1:8000/api/v1/';
const POLL_INTERVAL_MS = 300;
const MAX_RETRIES = 60; // ~18 seconds before giving up

type SplashGuardProps = {
	children: React.ReactNode;
};

export default function SplashGuard({ children }: SplashGuardProps) {
	const [ready, setReady] = useState(false);
	const [showRetry, setShowRetry] = useState(false);
	const retriesRef = useRef(0);
	const mountedRef = useRef(true);

	const setAppReady = useCallback(() => {
		if (mountedRef.current) {
			setReady(true);
		}
	}, []);

	const checkHealth = useCallback(async () => {
		try {
			await axios.get(API_HEALTH_URL, { timeout: 2000 });
			setAppReady();
		} catch {
			retriesRef.current += 1;
			if (retriesRef.current >= MAX_RETRIES && mountedRef.current) {
				// In dev mode (Vite-only preview without the Tauri backend),
				// automatically proceed after the retry window so the UI
				// can be inspected without waiting for the local API.
				if (import.meta.env.DEV) {
					setAppReady();
				} else {
					setShowRetry(true);
				}
			}
		}
	}, [setAppReady]);

	useEffect(() => {
		mountedRef.current = true;

		// In Vite dev mode without the Tauri backend, skip the splash
		// so the UI can be inspected immediately.
		if (import.meta.env.DEV && !('__TAURI_INTERNALS__' in window)) {
			setAppReady();
			return;
		}

		// ── Listen for the Tauri server-ready event (secondary signal) ──
		let unlisten: (() => void) | undefined;
		import('@tauri-apps/api/event')
			.then(({ listen }) => {
				listen('server-ready', () => {
					setAppReady();
				}).then((fn) => {
					unlisten = fn;
				});
			})
			.catch(() => {
				// Not running in Tauri (browser dev) — polling is enough
			});

		// ── Primary: poll health endpoint ──
		checkHealth();
		const interval = setInterval(() => {
			if (!mountedRef.current) return;
			checkHealth();
		}, POLL_INTERVAL_MS);

		return () => {
			mountedRef.current = false;
			clearInterval(interval);
			unlisten?.();
		};
	}, [checkHealth, setAppReady]);

	return (
		<AnimatePresence mode="wait">
			{!ready ? (
				<motion.div
					key="splash"
					exit={{ opacity: 0 }}
					transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
					className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A0A0A]"
				>
					{/* Subtle mesh gradient glow behind the loader */}
					<div
						className="absolute inset-0 opacity-30"
						style={{
							background:
								'radial-gradient(ellipse 60% 40% at 50% 45%, rgba(59,130,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 50% 55%, rgba(139,92,246,0.08) 0%, transparent 60%)',
						}}
					/>

					<div className="relative z-10 flex flex-col items-center gap-6">
						{/* Logo */}
						<img
							src="/images/SBO_LOGO.jpg"
							alt="SBO Logo"
							className="w-20 h-20 rounded-full object-cover ring-1 ring-white/10 shadow-lg"
						/>

						{/* Geometric loader — precise, minimal, Apple-style */}
						<GeometricLoader />

						{/* App title */}
						<div className="flex flex-col items-center gap-2">
							<h1
								className="text-2xl font-bold tracking-[-0.02em] text-white"
								style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
							>
								SEATS
							</h1>
							<p className="text-xs text-white/25 tracking-[0.04em] uppercase">
								SBO Attendance System
							</p>
						</div>

						{/* Status indicator */}
						{!showRetry ? (
							<div className="flex items-center gap-2">
								<span className="relative flex h-1.5 w-1.5">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
									<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
								</span>
								<span className="text-[11px] text-white/25 tracking-[0.04em] uppercase">
									Starting server…
								</span>
							</div>
						) : (
							<button
								type="button"
								onClick={() => {
									retriesRef.current = 0;
									setShowRetry(false);
									checkHealth();
								}}
								className="mt-2 px-4 py-1.5 rounded-full text-[11px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] hover:text-white/70 hover:bg-white/[0.08] transition-colors duration-200 active:scale-[0.97]"
							>
								Retry
							</button>
						)}
					</div>
				</motion.div>
			) : (
				<motion.div
					key="app"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
}

/* ── Geometric Loader ──────────────────────────────── */

function GeometricLoader() {
	return (
		<div className="relative flex items-center justify-center w-16 h-16">
			{/* Outer ring — slow continuous rotation */}
			<svg
				className="absolute inset-0 w-full h-full animate-spin"
				style={{ animationDuration: '3s' }}
				viewBox="0 0 64 64"
				fill="none"
			>
				<path
					d="M32 4 L32 12 M32 52 L32 60 M4 32 L12 32 M52 32 L60 32"
					stroke="rgba(255,255,255,0.12)"
					strokeWidth="1"
					strokeLinecap="round"
				/>
				<rect
					x="14"
					y="14"
					width="36"
					height="36"
					rx="6"
					stroke="rgba(255,255,255,0.08)"
					strokeWidth="1"
				/>
			</svg>

			{/* Inner diamond — counter-rotation, slightly faster */}
			<svg
				className="absolute inset-0 w-full h-full"
				style={{
					animation: 'loader-diamond 2.2s ease-in-out infinite',
				}}
				viewBox="0 0 64 64"
				fill="none"
			>
				<path
					d="M32 18 L44 32 L32 46 L20 32 Z"
					stroke="rgba(59,130,246,0.45)"
					strokeWidth="1.2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>

			{/* Center dot */}
			<div className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/60" />

			{/* Keyframe for the diamond rotation */}
			<style>{`
        @keyframes loader-diamond {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(0.88);
          }
        }
				@media (prefers-reduced-motion: reduce) {
					.animate-spin, [style*="loader-diamond"] {
						animation: none !important;
					}
				}
      `}</style>
		</div>
	);
}
