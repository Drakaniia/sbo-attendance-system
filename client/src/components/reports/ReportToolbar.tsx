import { useCallback, useState } from 'react';
import { FadersHorizontal, CaretDown, Printer, DownloadSimple } from '@phosphor-icons/react';
import { format } from 'date-fns';
import DateRangePicker, { type DateRange } from './DateRangePicker';
import { downloadReportsExcel } from '../../api/reports';
import { useNotification } from '../../hooks/useNotification';
import { cn } from '../../lib/utils';
import PageHeader from '../ui/PageHeader';

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
	const notification = useNotification();
	const [exportMenuOpen, setExportMenuOpen] = useState(false);

	// ── Subtitle: human-readable date range ──────────
	const subtitle = (() => {
		if (dateRange.preset === 'all') return 'All time';
		if ('startDate' in dateRange) {
			const start = dateRange.startDate;
			const end = dateRange.endDate;
			if (start === end) return format(new Date(start), 'MMMM d, yyyy');
			return `${format(new Date(start), 'MMM d')} – ${format(new Date(end), 'MMM d, yyyy')}`;
		}
		return '';
	})();

	const handleExcelExport = useCallback(
		async (mode: 'all' | 'event') => {
			setExportMenuOpen(false);
			try {
				const query: Record<string, string> = {};
				if (dateRange.preset !== 'all' && 'startDate' in dateRange) {
					query.startDate = dateRange.startDate;
					query.endDate = dateRange.endDate;
				}
				if (mode === 'event' && selectedEventId) {
					query.eventId = selectedEventId;
				}
				await downloadReportsExcel(query);
			} catch (error) {
				notification({
					title: 'Export failed',
					message: error instanceof Error ? error.message : String(error),
				});
			}
		},
		[dateRange, selectedEventId, notification]
	);

	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	return (
		<PageHeader
			eyebrow={
				<>
					<span>Insights</span>
					<span className="h-[3px] w-[3px] rounded-full bg-white/20" />
					<span className="tabular-nums">{subtitle}</span>
					{isRefreshing && (
						<span className="ml-1 flex items-center gap-1 text-[#9bbcff]/70">
							<span className="h-1 w-1 rounded-full bg-[#5b8def] motion-safe:animate-pulse" />
							Refreshing
						</span>
					)}
				</>
			}
			title="Reports"
			description={
				selectedEventTitle
					? `Filtered to ${selectedEventTitle}`
					: 'Turnout, courses, and rhythm over any window.'
			}
			actions={
				<div className="flex flex-wrap items-center justify-end gap-2">
					{onToggleSidebar && (
						<button
							type="button"
							onClick={onToggleSidebar}
							className="control h-8 w-8 px-0 xl:hidden"
							aria-label="Toggle filters"
						>
							<FadersHorizontal className="h-3.5 w-3.5" />
						</button>
					)}

					<DateRangePicker value={dateRange} onChange={onDateRangeChange} />

					<div className="relative">
						<button
							type="button"
							onClick={() => setExportMenuOpen((open) => !open)}
							className="control h-8 gap-1.5 px-2.5 text-[11px]"
						>
							<DownloadSimple className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Excel</span>
							<CaretDown
								className={cn(
									'h-3 w-3 text-white/35 transition-transform duration-200',
									exportMenuOpen && 'rotate-180'
								)}
							/>
						</button>

						{exportMenuOpen && (
							<>
								<div className="fixed inset-0 z-20" onClick={() => setExportMenuOpen(false)} />
								<div className="absolute right-0 top-[calc(100%+8px)] z-30 w-52 origin-top-right animate-[fadeIn_0.15s_ease-out_forwards] rounded-2xl border border-white/[0.1] bg-[rgba(19,20,24,0.92)] p-1.5 shadow-float backdrop-blur-2xl">
									<button
										type="button"
										onClick={() => handleExcelExport('all')}
										className="w-full rounded-xl px-3 py-2 text-left text-[12px] text-white/58 transition-colors hover:bg-white/[0.05] hover:text-white"
									>
										Export all events
									</button>
									{selectedEventId && (
										<button
											type="button"
											onClick={() => handleExcelExport('event')}
											className="w-full rounded-xl px-3 py-2 text-left text-[12px] text-white/58 transition-colors hover:bg-white/[0.05] hover:text-white"
										>
											Export this event only
										</button>
									)}
								</div>
							</>
						)}
					</div>

					<button
						type="button"
						onClick={handlePrint}
						className="control h-8 w-8 px-0 sm:w-auto sm:px-2.5 sm:text-[11px]"
						title="Print or save as PDF"
						aria-label="Print reports"
					>
						<Printer className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Print</span>
					</button>
				</div>
			}
		/>
	);
}
