import {
	Calendar,
	CheckCircle,
	ClipboardText,
	TrendUp,
	Trophy,
	Users,
} from '@phosphor-icons/react';
import ReportToolbar from '../components/reports/ReportToolbar';
import ReportSidebar from '../components/reports/ReportSidebar';
import EventPickerModal from '../components/reports/EventPickerModal';
import CompletionRatesTable from '../components/reports/CompletionRatesTable';
import MetricStrip from '../components/ui/MetricStrip';
import PanelHeading from '../components/ui/PanelHeading';
import AttendanceTrendChart from '../components/charts/AttendanceTrendChart';
import EventAttendanceChart from '../components/charts/EventAttendanceChart';
import CourseDonut from '../components/charts/CourseDonut';
import HeatmapChart from '../components/charts/HeatmapChart';
import type { HeatmapDailyEntry, HeatmapHourlyEntry } from '../api/reports';
import { useReportsData } from '../hooks/useReportsData';

const CHECK_IN_COLOR = '#6e9bff';
const CHECK_OUT_COLOR = '#43d7b0';

const LEADERBOARD_COLORS = ['#8fb4ff', '#9ff0e8', '#cdc2ff', '#ffd79a', '#b2ecc3', '#ffb8c8'];

function rateColor(rate: number) {
	if (rate >= 80) return '#43d7b0';
	if (rate >= 50) return '#f5b85b';
	return '#f07c9a';
}

function initials(name: string) {
	const parts = name.trim().split(/\s+/);
	return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '—';
}

export default function Reports() {
	const {
		sidebarOpen,
		setSidebarOpen,
		dateRange,
		selectedEventId,
		selectedEventTitle,
		eventPickerOpen,
		setEventPickerOpen,
		isRefreshing,
		stats,
		statsLoading,
		eventBreakdown,
		leaderboard,
		leaderboardLoading,
		heatmapHourly,
		heatmapDaily,
		heatmapIsLoading,
		attendanceTrend,
		courseDistribution,
		yearDistribution,
		handleClearFilters,
		handleEventSelect,
		handleDateRangeChange,
	} = useReportsData();

	const leaders = (leaderboard ?? []).slice(0, 6);
	const maxAttendances = leaders.reduce((max, entry) => Math.max(max, entry.totalAttendances), 0);

	const yearData =
		yearDistribution?.map((entry) => ({
			course: `Year ${entry.year}`,
			students: entry.students,
		})) ?? [];

	return (
		<div className="flex flex-col gap-5 pb-4">
			<ReportToolbar
				dateRange={dateRange}
				onDateRangeChange={handleDateRangeChange}
				selectedEventId={selectedEventId}
				selectedEventTitle={selectedEventTitle}
				onToggleSidebar={() => setSidebarOpen((open) => !open)}
				isRefreshing={isRefreshing}
			/>

			<div className="flex items-start gap-5">
				<ReportSidebar
					open={sidebarOpen}
					onClose={() => setSidebarOpen(false)}
					dateRange={dateRange}
					selectedEventId={selectedEventId}
					selectedEventTitle={selectedEventTitle}
					stats={stats ?? null}
					statsLoading={statsLoading}
					onOpenEventPicker={() => setEventPickerOpen(true)}
					onClearFilters={handleClearFilters}
				/>

				<div className="flex min-w-0 flex-1 flex-col gap-5">
					<MetricStrip
						className="lg:grid-cols-5"
						items={[
							{
								label: 'Check-ins',
								value: stats?.totalCheckIns ?? 0,
								icon: ClipboardText,
								accent: '#8fb4ff',
								hint: 'Scans recorded in range',
							},
							{
								label: 'Check-outs',
								value: stats?.totalCheckOuts ?? 0,
								icon: CheckCircle,
								accent: '#9ff0e8',
								hint: 'Loops closed',
							},
							{
								label: 'Completion',
								value: `${stats?.attendanceRate ?? 0}%`,
								icon: TrendUp,
								accent: '#b2ecc3',
								hint: 'Check-outs over check-ins',
							},
							{
								label: 'Students',
								value: stats?.uniqueStudents ?? 0,
								icon: Users,
								accent: '#cdc2ff',
								hint: 'Unique attendees',
							},
							{
								label: 'Events',
								value: stats?.activeEvents ?? 0,
								icon: Calendar,
								accent: '#ffd79a',
								hint: 'Active in range',
							},
						]}
					/>

					{/* Trend + course mix */}
					<div className="grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
						<section className="panel flex min-w-0 flex-col p-6">
							<PanelHeading eyebrow="Trend" title="Attendance over time" />
							<div className="mt-3 flex items-center gap-4">
								<span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-white/35">
									<span
										className="h-[5px] w-[5px] rounded-full"
										style={{ background: CHECK_IN_COLOR }}
									/>
									Check-ins
								</span>
								<span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-white/35">
									<span
										className="h-[5px] w-[5px] rounded-full"
										style={{ background: CHECK_OUT_COLOR }}
									/>
									Check-outs
								</span>
							</div>
							<div className="mt-3">
								<AttendanceTrendChart data={attendanceTrend ?? []} className="h-[280px]" />
							</div>
						</section>

						<section className="panel flex min-w-0 flex-col p-6">
							<PanelHeading eyebrow="Roster" title="Course mix" />
							<div className="mt-5 flex flex-1 items-center">
								<div className="w-full">
									<CourseDonut data={courseDistribution ?? []} />
								</div>
							</div>
						</section>
					</div>

					{/* Event breakdown + year mix */}
					<div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
						<section className="panel flex min-w-0 flex-col p-6">
							<PanelHeading eyebrow="Turnout" title="Event breakdown" />
							<div className="mt-3 flex items-center gap-4">
								<span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-white/35">
									<span
										className="h-[5px] w-[5px] rounded-full"
										style={{ background: CHECK_IN_COLOR }}
									/>
									Checked in
								</span>
								<span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-white/35">
									<span
										className="h-[5px] w-[5px] rounded-full"
										style={{ background: CHECK_OUT_COLOR }}
									/>
									Checked out
								</span>
							</div>
							<div className="mt-3 h-[300px]">
								<EventAttendanceChart events={eventBreakdown ?? []} className="h-full" />
							</div>
						</section>

						<section className="panel flex min-w-0 flex-col p-6">
							<PanelHeading eyebrow="Year level" title="Who attends" />
							<div className="mt-5 flex flex-1 items-center">
								<div className="w-full">
									<CourseDonut data={yearData} />
								</div>
							</div>
						</section>
					</div>

					{/* Heatmap */}
					<HeatmapChart
						hourlyData={(heatmapHourly as HeatmapHourlyEntry[]) ?? []}
						dailyData={(heatmapDaily as HeatmapDailyEntry[]) ?? []}
						isLoading={heatmapIsLoading}
					/>

					{/* Leaderboard */}
					<section className="panel flex min-w-0 flex-col p-6">
						<PanelHeading
							eyebrow="Students"
							title="Leaderboard"
							action={
								<span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-micro text-white/25">
									<Trophy className="h-3 w-3" />
									Top {leaders.length}
								</span>
							}
						/>

						{leaderboardLoading ? (
							<div className="mt-4 space-y-2">
								{Array.from({ length: 5 }).map((_, index) => (
									<div
										key={index}
										className="h-12 animate-pulse rounded-xl bg-white/[0.025]"
										style={{ animationDelay: `${index * 60}ms` }}
									/>
								))}
							</div>
						) : leaders.length > 0 ? (
							<ol className="mt-4 space-y-0.5">
								{leaders.map((entry, index) => {
									const color = LEADERBOARD_COLORS[index % LEADERBOARD_COLORS.length];
									const relative = maxAttendances > 0 ? entry.totalAttendances / maxAttendances : 0;
									return (
										<li
											key={entry.studentId}
											className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.028]"
										>
											<span className="numeric w-4 shrink-0 text-center text-[10.5px] font-medium text-white/22">
												{index + 1}
											</span>
											<span
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
												style={{ background: `${color}1f`, color }}
											>
												{initials(entry.name)}
											</span>
											<div className="min-w-0 flex-1">
												<div className="flex items-baseline justify-between gap-3">
													<p className="truncate text-[12.5px] font-medium text-white/78">
														{entry.name || '—'}
													</p>
													<span className="numeric shrink-0 text-[11px] tabular-nums text-white/42">
														{entry.totalAttendances}
														<span className="ml-1 text-[9.5px] text-white/22">events</span>
													</span>
												</div>
												<div className="mt-1.5 flex items-center gap-2.5">
													<span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.055]">
														<span
															className="block h-full rounded-full transition-[width] duration-500 ease-apple-out"
															style={{
																width: `${Math.max(relative * 100, 2)}%`,
																background: color,
															}}
														/>
													</span>
													<span
														className="numeric w-8 shrink-0 text-right text-[9.5px] tabular-nums"
														style={{ color: rateColor(entry.checkInRate) }}
													>
														{entry.checkInRate}%
													</span>
												</div>
											</div>
											<span className="hidden w-[86px] shrink-0 truncate text-right text-[10px] text-white/24 sm:block">
												{entry.course ? `${entry.course}/${entry.year}` : '—'}
											</span>
										</li>
									);
								})}
							</ol>
						) : (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<p className="text-[13px] font-medium text-white/42">No leaderboard data yet</p>
								<p className="mt-1 max-w-[32ch] text-[11.5px] text-white/25">
									Attendance in this range will rank students here.
								</p>
							</div>
						)}
					</section>

					{/* Completion rates */}
					<CompletionRatesTable data={eventBreakdown ?? []} />
				</div>
			</div>

			<EventPickerModal
				opened={eventPickerOpen}
				onClose={() => setEventPickerOpen(false)}
				selectedEventId={selectedEventId}
				onSelect={handleEventSelect}
			/>
		</div>
	);
}
