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
		<div className="flex flex-col gap-4 p-4 h-full">
			{/* Header */}
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold text-white/40 uppercase tracking-micro">Filters</p>
				{/* Close button (slide-over mode only) */}
				<button
					type="button"
					onClick={onClose}
					className="xl:hidden p-1.5 -mr-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors active:scale-90"
					aria-label="Close filters"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Active filters summary */}
			<div className="space-y-2">
				{dateRange.preset !== 'all' ? (
					<FilterChip label="Date range" onRemove={onClearFilters} />
				) : (
					<p className="text-xs text-white/25">All time</p>
				)}

				{selectedEventId ? (
					<FilterChip label={selectedEventTitle ?? 'Event'} onRemove={onClearFilters} />
				) : (
					<p className="text-xs text-white/25">All events</p>
				)}
			</div>

			{/* Divider */}
			<div className="border-t border-white/[0.06]" />

			{/* Event selector */}
			<button
				type="button"
				onClick={onOpenEventPicker}
				className={cn(
					'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm text-left transition-colors duration-150',
					selectedEventId
						? 'border-[#5b8def]/25 bg-[#5b8def]/[0.08] text-[#cfe0ff]'
						: 'border-white/[0.06] bg-white/[0.022] text-white/45 hover:bg-white/[0.04] hover:text-white/70'
				)}
			>
				<Calendar className="w-4 h-4 shrink-0" />
				<span className="truncate">{selectedEventTitle ?? 'Select event…'}</span>
			</button>

			{/* Clear filters */}
			{hasFilters && (
				<button
					type="button"
					onClick={onClearFilters}
					className="text-xs text-white/40 hover:text-white/70 transition-colors self-start"
				>
					Clear all filters
				</button>
			)}

			{/* Divider */}
			<div className="border-t border-white/[0.06]" />

			{/* Quick stats */}
			<p className="text-[10px] font-semibold text-white/25 uppercase tracking-micro">
				Quick Stats
			</p>
			<div className="grid grid-cols-2 gap-2">
				{quickStats.map((stat) => (
					<div
						key={stat.label}
						className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3"
					>
						<stat.icon className="mb-1.5 h-3.5 w-3.5 text-[#8fb4ff]/60" />
						<p
							className={cn(
								'text-base font-bold text-white tracking-tight tabular-nums',
								statsLoading && 'animate-pulse text-white/20'
							)}
						>
							{stat.value}
						</p>
						<p className="text-[10px] text-white/25 uppercase tracking-micro mt-0.5">
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
			<aside className="hidden xl:block w-[260px] shrink-0">
				<div className="panel sticky top-[104px] overflow-hidden">{sidebarContent}</div>
			</aside>

			{/* Mobile/tablet: slide-over drawer */}
			<AnimatePresence>
				{open && (
					<>
						{/* Scrim */}
						<motion.div
							className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={reduceMotion ? { duration: 0.15 } : { duration: 0.25 }}
							onClick={onClose}
						/>

						{/* Drawer */}
						<motion.aside
							className="fixed inset-y-0 left-0 z-50 w-[280px] glass-modal rounded-r-3xl xl:hidden"
							initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
							animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
							exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
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
							<div className="h-full overflow-y-auto">{sidebarContent}</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>
		</>
	);
}

// ── Filter chip ─────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
	return (
		<div className="inline-flex items-center gap-1.5 rounded-full border border-[#5b8def]/25 bg-[#5b8def]/[0.08] px-2.5 py-1 text-[11px] text-[#cfe0ff]">
			<span className="truncate max-w-[120px]">{label}</span>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onRemove();
				}}
				className="rounded-full p-0.5 text-[#8fb4ff]/50 transition-colors hover:bg-[#5b8def]/10 hover:text-[#cfe0ff]"
				aria-label={`Remove ${label} filter`}
			>
				<X className="w-3 h-3" />
			</button>
		</div>
	);
}
