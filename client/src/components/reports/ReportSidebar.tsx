import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Users, ChartBar, Calendar } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import type { ReportsStats } from '../../api/reports';
import type { DateRange } from './DateRangePicker';

type ReportSidebarProps = {
	/** Whether the sidebar is open (for slide-over mode on smaller screens) */
	open: boolean;
	onClose: () => void;
	dateRange: DateRange;
	selectedEventId: string | null;
	selectedEventTitle?: string;
	stats: ReportsStats | null;
	statsLoading: boolean;
	onOpenEventPicker: () => void;
	onClearFilters: () => void;
};

export default function ReportSidebar({
	open,
	onClose,
	dateRange,
	selectedEventId,
	selectedEventTitle,
	stats,
	statsLoading,
	onOpenEventPicker,
	onClearFilters,
}: ReportSidebarProps) {
	const reduceMotion = useReducedMotion();

	const hasFilters = dateRange.preset !== 'all' || selectedEventId !== null;

	const quickStats = [
		{
			label: 'Records',
			value: stats?.totalRecords ?? '–',
			icon: ChartBar,
		},
		{
			label: 'Students',
			value: stats?.uniqueStudents ?? '–',
			icon: Users,
		},
		{
			label: 'Rate',
			value: stats ? `${stats.attendanceRate}%` : '–',
			icon: ChartBar,
		},
		{
			label: 'Events',
			value: stats?.activeEvents ?? '–',
			icon: Calendar,
		},
	];

	const sidebarContent = (
		<div className='flex flex-col gap-4 p-4 h-full'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<p className='text-xs font-semibold text-white/40 uppercase tracking-micro'>
					Filters
				</p>
				{/* Close button (slide-over mode only) */}
				<button
					type='button'
					onClick={onClose}
					className='xl:hidden p-1.5 -mr-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors active:scale-90'
					aria-label='Close filters'
				>
					<X className='w-4 h-4' />
				</button>
			</div>

			{/* Active filters summary */}
			<div className='space-y-2'>
				{dateRange.preset !== 'all' ? (
					<FilterChip
						label='Date range'
						onRemove={onClearFilters}
					/>
				) : (
					<p className='text-xs text-white/25'>All time</p>
				)}

				{selectedEventId ? (
					<FilterChip
						label={selectedEventTitle ?? 'Event'}
						onRemove={onClearFilters}
					/>
				) : (
					<p className='text-xs text-white/25'>All events</p>
				)}
			</div>

			{/* Divider */}
			<div className='border-t border-white/[0.06]' />

			{/* Event selector */}
			<button
				type='button'
				onClick={onOpenEventPicker}
				className={cn(
					'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm text-left transition-colors duration-150',
					selectedEventId
						? 'border-indigo-400/20 bg-indigo-400/[0.06] text-indigo-300'
						: 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
				)}
			>
				<Calendar className='w-4 h-4 shrink-0' />
				<span className='truncate'>
					{selectedEventTitle ?? 'Select event…'}
				</span>
			</button>

			{/* Clear filters */}
			{hasFilters && (
				<button
					type='button'
					onClick={onClearFilters}
					className='text-xs text-white/40 hover:text-white/70 transition-colors self-start'
				>
					Clear all filters
				</button>
			)}

			{/* Divider */}
			<div className='border-t border-white/[0.06]' />

			{/* Quick stats */}
			<p className='text-[10px] font-semibold text-white/25 uppercase tracking-micro'>
				Quick Stats
			</p>
			<div className='grid grid-cols-2 gap-2'>
				{quickStats.map((stat) => (
					<div
						key={stat.label}
						className='rounded-xl bg-white/[0.03] border border-white/[0.05] p-3'
					>
						<stat.icon className='w-3.5 h-3.5 text-indigo-400/50 mb-1.5' />
						<p
							className={cn(
								'text-base font-bold text-white tracking-tight tabular-nums',
								statsLoading && 'animate-pulse text-white/20'
							)}
						>
							{stat.value}
						</p>
						<p className='text-[10px] text-white/25 uppercase tracking-micro mt-0.5'>
							{stat.label}
						</p>
					</div>
				))}
			</div>
		</div>
	);

	return (
		<>
			{/* Desktop: fixed sidebar */}
			<aside className='hidden xl:block w-[260px] shrink-0'>
				<div className='sticky top-[72px] glass rounded-2xl overflow-hidden'>
					{sidebarContent}
				</div>
			</aside>

			{/* Mobile/tablet: slide-over drawer */}
			<AnimatePresence>
				{open && (
					<>
						{/* Scrim */}
						<motion.div
							className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={
								reduceMotion
									? { duration: 0.15 }
									: { duration: 0.25 }
							}
							onClick={onClose}
						/>

						{/* Drawer */}
						<motion.aside
							className='fixed inset-y-0 left-0 z-50 w-[280px] glass-modal rounded-r-3xl xl:hidden'
							initial={
								reduceMotion
									? { opacity: 0 }
									: { opacity: 0, x: -24 }
							}
							animate={
								reduceMotion
									? { opacity: 1 }
									: { opacity: 1, x: 0 }
							}
							exit={
								reduceMotion
									? { opacity: 0 }
									: { opacity: 0, x: -24 }
							}
							transition={
								reduceMotion
									? { duration: 0.15 }
									: {
											type: 'spring',
											bounce: 0,
											duration: 0.4,
									  }
							}
						>
							<div className='h-full overflow-y-auto'>
								{sidebarContent}
							</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>
		</>
	);
}

// ── Filter chip ─────────────────────────────────────────────────────────

function FilterChip({
	label,
	onRemove,
}: {
	label: string;
	onRemove: () => void;
}) {
	return (
		<div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-400/[0.08] border border-indigo-400/20 text-xs text-indigo-300'>
			<span className='truncate max-w-[120px]'>{label}</span>
			<button
				type='button'
				onClick={(e) => {
					e.stopPropagation();
					onRemove();
				}}
				className='p-0.5 -mr-0.5 rounded-full text-indigo-400/50 hover:text-indigo-300 hover:bg-indigo-400/10 transition-colors'
				aria-label={`Remove ${label} filter`}
			>
				<X className='w-3 h-3' />
			</button>
		</div>
	);
}
