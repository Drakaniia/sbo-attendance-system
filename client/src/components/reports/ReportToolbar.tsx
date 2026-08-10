import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FadersHorizontal, CaretDown, Printer, DownloadSimple } from '@phosphor-icons/react';
import { format } from 'date-fns';
import DateRangePicker, { type DateRange } from './DateRangePicker';
import { downloadReportsCsv } from '../../api/reports';
import { useNotification } from '../../hooks/useNotification';
import { cn } from '../../lib/utils';

type ReportToolbarProps = {
	dateRange: DateRange;
	onDateRangeChange: (range: DateRange) => void;
	selectedEventId: string | null;
	selectedEventTitle?: string;
	onToggleSidebar?: () => void;
	isRefreshing?: boolean;
};

export default function ReportToolbar({
	dateRange,
	onDateRangeChange,
	selectedEventId,
	selectedEventTitle,
	onToggleSidebar,
	isRefreshing = false,
}: ReportToolbarProps) {
	const reduceMotion = useReducedMotion();
	const notification = useNotification();
	const [csvMenuOpen, setCsvMenuOpen] = useState(false);

	// ── Subtitle: human-readable date range ──────────
	const subtitle = (() => {
		if (dateRange.preset === 'all') return 'All time';
		if ('startDate' in dateRange) {
			const s = dateRange.startDate;
			const e = dateRange.endDate;
			if (s === e) return format(new Date(s), 'MMMM d, yyyy');
			return `${format(new Date(s), 'MMM d')} – ${format(new Date(e), 'MMM d, yyyy')}`;
		}
		return '';
	})();

	// ── CSV export ───────────────────────────────────
	const handleCsvExport = useCallback(
		async (mode: 'all' | 'event') => {
			setCsvMenuOpen(false);
			try {
				const query: Record<string, string> = {};
				if (dateRange.preset !== 'all' && 'startDate' in dateRange) {
					query.startDate = dateRange.startDate;
					query.endDate = dateRange.endDate;
				}
				if (mode === 'event' && selectedEventId) {
					query.eventId = selectedEventId;
				}
				await downloadReportsCsv(query);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				notification({
					title: 'Export failed',
					message: msg,
				});
			}
		},
		[dateRange, selectedEventId, notification]
	);

	// ── Print ────────────────────────────────────────
	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	return (
		<header className='sticky -top-5 z-20 glass-heavy pt-5 pb-4 -mx-5 px-5'>
			<div className='flex items-center justify-between gap-4'>
				{/* Left: title + subtitle */}
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: 'spring',
						bounce: 0,
						duration: 0.4,
					}}
					className='min-w-0'
				>
					<div className='flex items-center gap-3'>
						{/* Slide-over toggle (visible below 1280px) */}
						{onToggleSidebar && (
							<button
								type='button'
								onClick={onToggleSidebar}
								className='xl:hidden p-2 -ml-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors active:scale-90'
								aria-label='Toggle filters'
							>
								<FadersHorizontal className='w-5 h-5' />
							</button>
						)}
					<h1 className='text-2xl font-bold tracking-tight text-white flex items-center gap-2 truncate'>
						Reports
						{isRefreshing && (
							<span className='inline-block w-2 h-2 rounded-full bg-indigo-400 motion-safe:animate-pulse' />
						)}
					</h1>
					</div>
					{subtitle && (
						<p className='text-white/40 text-sm mt-1 truncate'>
							{subtitle}
							{selectedEventTitle && (
								<span className='text-indigo-400/70'>
									{' – '}
									{selectedEventTitle}
								</span>
							)}
						</p>
					)}
				</motion.div>

				{/* Right: controls */}
				<div className='flex items-center gap-2'>
					{/* Date Range Picker */}
					<DateRangePicker
						value={dateRange}
						onChange={onDateRangeChange}
					/>

					{/* CSV Export dropdown */}
					<div className='relative'>
						<button
							type='button'
							onClick={() => setCsvMenuOpen((o) => !o)}
							className='flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] text-sm text-white/60 hover:bg-white/[0.06] hover:text-white/80 transition-[background-color,border-color,transform] duration-150 ease-apple-out active:scale-[0.97]'
						>
							<DownloadSimple className='w-4 h-4' />
							<span className='hidden sm:inline'>CSV</span>
							<CaretDown
								className={cn(
									'w-3 h-3 text-white/40 transition-transform duration-200',
									csvMenuOpen && 'rotate-180'
								)}
							/>
						</button>

						{csvMenuOpen && (
							<>
								<div
									className='fixed inset-0 z-20'
									onClick={() => setCsvMenuOpen(false)}
								/>
								<div className='absolute right-0 top-[calc(100%+8px)] z-30 w-48 glass-modal rounded-2xl p-1.5 origin-top-right motion-safe:animate-[fadeIn_0.15s_ease-out_forwards]'>
									<button
										type='button'
										onClick={() => handleCsvExport('all')}
										className='w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors'
									>
										Export all events
									</button>
									{selectedEventId && (
										<button
											type='button'
											onClick={() => handleCsvExport('event')}
											className='w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors'
										>
											Export this event only
										</button>
									)}
								</div>
							</>
						)}
					</div>

					{/* Print button */}
					<button
						type='button'
						onClick={handlePrint}
						className='flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] text-sm text-white/60 hover:bg-white/[0.06] hover:text-white/80 transition-[background-color,border-color,transform] duration-150 ease-apple-out active:scale-[0.97]'
						title='Print or save as PDF'
					>
						<Printer className='w-4 h-4' />
						<span className='hidden sm:inline'>Print</span>
					</button>
				</div>
			</div>
		</header>
	);
}
