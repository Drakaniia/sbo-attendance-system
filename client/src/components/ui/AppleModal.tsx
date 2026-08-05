import {
	useEffect,
	useId,
	useRef,
	type PropsWithChildren,
	type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type AppleModalProps = PropsWithChildren<{
	opened: boolean;
	onClose: () => void;
	title?: ReactNode;
	subtitle?: ReactNode;
	size?: 'sm' | 'md' | 'lg';
}>;

const SIZES = {
	sm: 'max-w-sm',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
};

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Spring-anchored modal: scales from the trigger (origin), slides in on a
 * critically damped spring, dims the scrim to focus. Exit mirrors the enter
 * path exactly (spatial consistency). Closes on backdrop + Escape. Restores
 * focus to the trigger, locks background scroll, and traps Tab within.
 */
export default function AppleModal({
	opened,
	onClose,
	title,
	subtitle,
	size = 'md',
	children,
}: AppleModalProps) {
	const reduceMotion = useReducedMotion();
	const titleId = useId();
	const panelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<Element | null>(null);

		// Remember the trigger, restore focus on close.
		// preventScroll so focusing the modal panel doesn't jump the page.
		useEffect(() => {
			if (opened) {
				triggerRef.current = document.activeElement;
				panelRef.current?.focus({ preventScroll: true });
			} else if (triggerRef.current instanceof HTMLElement) {
				triggerRef.current.focus();
			}
		}, [opened]);

	// Escape to close
	useEffect(() => {
		if (!opened) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [opened, onClose]);

		// Scroll lock the background while open.
		// Compensate for scrollbar width so the page doesn't jump when overflow is hidden
		// (critical for modals triggered from scrolled-down content like table rows).
		// Save/restore scroll position to prevent loss when toggling overflow.
		useEffect(() => {
			if (!opened) return;
			const scrollY = window.scrollY;
			const originalOverflow = document.body.style.overflow;
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

			document.body.style.overflow = 'hidden';
			document.body.style.paddingRight = `${scrollbarWidth}px`;

			return () => {
				document.body.style.overflow = originalOverflow;
				document.body.style.paddingRight = '';
				window.scrollTo(0, scrollY);
			};
		}, [opened]);

	// Trap Tab focus inside the panel
	useEffect(() => {
		if (!opened) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;
			const panel = panelRef.current;
			if (!panel) return;
			const focusables = Array.from(
				panel.querySelectorAll<HTMLElement>(FOCUSABLE)
			).filter((el) => el.offsetParent !== null);
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [opened]);

	return createPortal(
		<AnimatePresence>
			{opened && (
				<div className='fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6'>
					{/* Scrim — dims to focus */}
					<motion.div
						className='absolute inset-0 bg-black/60 backdrop-blur-sm'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
						onClick={onClose}
					/>
					{/* Sheet — scales in, mirror path out */}
					<motion.div
						ref={panelRef}
						role='dialog'
						aria-modal='true'
						aria-labelledby={titleId}
						tabIndex={-1}
						className={cn(
							'relative w-full glass-modal rounded-t-3xl sm:rounded-3xl overflow-hidden outline-none',
							SIZES[size]
						)}
						initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
						animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
						exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
						transition={
							reduceMotion
								? { duration: 0.15 }
								: { type: 'spring', bounce: 0, duration: 0.45 }
						}
					>
						<div className='flex items-start justify-between gap-4 px-6 pt-6 pb-1'>
							<div className='min-w-0'>
								{title && (
									<h2
										id={titleId}
										className='text-xl font-bold tracking-display text-white'
									>
										{title}
									</h2>
								)}
								{subtitle && (
									<p className='text-sm text-white/40 mt-0.5'>{subtitle}</p>
								)}
							</div>
							<button
								onClick={onClose}
								aria-label='Close'
								className='shrink-0 p-2 -mr-2 -mt-1 rounded-full text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors active:scale-90'
							>
								<X className='w-5 h-5' />
							</button>
						</div>
						<div className='px-6 py-4 max-h-[70vh] overflow-y-auto'>{children}</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>,
		document.body
	);
}
