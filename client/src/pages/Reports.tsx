import { Users, ClipboardText, CheckCircle, TrendUp, Calendar } from '@phosphor-icons/react';
import ReportToolbar from '../components/reports/ReportToolbar';
import ReportSidebar from '../components/reports/ReportSidebar';
import EventPickerModal from '../components/reports/EventPickerModal';
import CompletionRatesTable from '../components/reports/CompletionRatesTable';
import { StatCard } from '../components/charts/StatCard';
import { DashboardAreaChart } from '../components/charts/DashboardAreaChart';
import { DashboardBarChart } from '../components/charts/DashboardBarChart';
import { DashboardPieChart } from '../components/charts/DashboardPieChart';
import HeatmapChart from '../components/charts/HeatmapChart';
import type { HeatmapDailyEntry, HeatmapHourlyEntry } from '../api/reports';
import { useReportsData, DONUT_COLORS, TREND_COLORS, YEAR_COLORS } from '../hooks/useReportsData';

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
		trendChartData,
		eventChartData,
		courseChartData,
		yearChartData,
		handleClearFilters,
		handleEventSelect,
		handleDateRangeChange,
	} = useReportsData();

	return (
		<div className="flex flex-col gap-6 pb-8 -mx-5 -mt-5 px-5">
			{/* ── Toolbar ───────────────────────────────── */}
			<ReportToolbar
				dateRange={dateRange}
				onDateRangeChange={handleDateRangeChange}
				selectedEventId={selectedEventId}
				selectedEventTitle={selectedEventTitle}
				onToggleSidebar={() => setSidebarOpen((o) => !o)}
				isRefreshing={isRefreshing}
			/>

			{/* ── Body: sidebar + content ────────────────── */}
			<div className="flex gap-5">
				{/* Sidebar */}
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

				{/* Content area */}
				<div className="flex-1 min-w-0 flex flex-col gap-5">
					{/* Stat Cards Row */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
						<StatCard
							title="Total Check-ins"
							value={stats?.totalCheckIns ?? 0}
							icon={ClipboardText}
							color="#6366f1"
							delay={0}
						/>
						<StatCard
							title="Total Check-outs"
							value={stats?.totalCheckOuts ?? 0}
							icon={CheckCircle}
							color="#818cf8"
							delay={60}
						/>
						<StatCard
							title="Attendance Rate"
							value={`${stats?.attendanceRate ?? 0}%`}
							icon={TrendUp}
							color="#a78bfa"
							trend={
								stats && stats.attendanceRate >= 70
									? 'up'
									: stats && stats.attendanceRate >= 40
										? 'neutral'
										: 'down'
							}
							trendValue="check-out rate"
							delay={120}
						/>
						<StatCard
							title="Unique Students"
							value={stats?.uniqueStudents ?? 0}
							icon={Users}
							color="#c4b5fd"
							delay={180}
						/>
						<StatCard
							title="Active Events"
							value={stats?.activeEvents ?? 0}
							icon={Calendar}
							color="#6366f1"
							delay={240}
						/>
					</div>

					{/* Charts Row 1 */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
						{/* Attendance Trend */}
						<div className="glass glass-hover rounded-2xl p-5">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="text-base font-semibold text-white tracking-tight">
										Attendance Trend
									</h3>
									<p className="text-xs text-white/30 mt-0.5">Daily check-ins &amp; check-outs</p>
								</div>
								<div className="flex items-center gap-3 text-xs">
									<div className="flex items-center gap-1.5">
										<div
											className="w-2.5 h-2.5 rounded-sm"
											style={{ background: TREND_COLORS.checkIns }}
										/>
										<span className="text-white/50">In</span>
									</div>
									<div className="flex items-center gap-1.5">
										<div
											className="w-2.5 h-2.5 rounded-sm"
											style={{ background: TREND_COLORS.checkOuts }}
										/>
										<span className="text-white/50">Out</span>
									</div>
								</div>
							</div>
							<DashboardAreaChart
								data={trendChartData}
								dataKeys={[
									{ key: 'CheckIns', color: TREND_COLORS.checkIns, name: 'Check-ins' },
									{ key: 'CheckOuts', color: TREND_COLORS.checkOuts, name: 'Check-outs' },
								]}
								xKey="date"
								height={280}
								curveType="monotone"
								gradientFrom={TREND_COLORS.checkIns}
								gradientTo={TREND_COLORS.checkOuts}
							/>
						</div>

						{/* Event Breakdown */}
						<div className="glass glass-hover rounded-2xl p-5">
							<div className="mb-4">
								<h3 className="text-base font-semibold text-white tracking-tight">
									Event Breakdown
								</h3>
								<p className="text-xs text-white/30 mt-0.5">Check-ins &amp; check-outs per event</p>
							</div>
							<DashboardBarChart
								data={eventChartData}
								dataKeys={[
									{ key: 'CheckIns', color: '#6366f1', name: 'Check-ins' },
									{ key: 'CheckOuts', color: '#a78bfa', name: 'Check-outs' },
								]}
								xKey="name"
								height={280}
								layout="horizontal"
							/>
						</div>
					</div>

					{/* Charts Row 2 */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
						{/* Course Distribution */}
						<div className="glass glass-hover rounded-2xl p-5">
							<div className="mb-2">
								<h3 className="text-base font-semibold text-white tracking-tight">
									Course Distribution
								</h3>
								<p className="text-xs text-white/30 mt-0.5">Students per course</p>
							</div>
							<DashboardPieChart
								data={courseChartData}
								colors={DONUT_COLORS}
								height={260}
								innerRadius={55}
								outerRadius={95}
							/>
						</div>

						{/* Year Distribution */}
						<div className="glass glass-hover rounded-2xl p-5">
							<div className="mb-2">
								<h3 className="text-base font-semibold text-white tracking-tight">
									Year Distribution
								</h3>
								<p className="text-xs text-white/30 mt-0.5">Students per year level</p>
							</div>
							<DashboardPieChart
								data={yearChartData}
								colors={YEAR_COLORS}
								height={260}
								innerRadius={55}
								outerRadius={95}
							/>
						</div>
					</div>

					{/* Heatmap */}
					<HeatmapChart
						hourlyData={(heatmapHourly as HeatmapHourlyEntry[]) ?? []}
						dailyData={(heatmapDaily as HeatmapDailyEntry[]) ?? []}
						isLoading={heatmapIsLoading}
					/>

					{/* Leaderboard */}
					<div className="glass glass-hover rounded-2xl p-5">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-white tracking-tight">Leaderboard</h3>
							<p className="text-xs text-white/30 mt-0.5">Top students by attendance</p>
						</div>
						{leaderboardLoading ? (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-white/[0.06]">
											{['#', 'Student ID', 'Name', 'Course/Year', 'Attendances', 'Rate'].map(
												(h) => (
													<th
														key={h}
														className="text-left py-3 px-3 text-xs font-medium text-white/20 uppercase tracking-wider"
													>
														{h}
													</th>
												)
											)}
										</tr>
									</thead>
									<tbody>
										{Array.from({ length: 5 }).map((_, i) => (
											<tr key={`skel-${i}`} className="border-b border-white/[0.03]">
												{Array.from({ length: 6 }).map((_, j) => (
													<td key={j} className="py-3 px-3">
														<div
															className="h-4 rounded bg-white/[0.04] animate-pulse"
															style={{ width: j < 3 ? '80%' : '50%' }}
														/>
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : leaderboard && leaderboard.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-white/[0.06]">
											<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
												#
											</th>
											<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
												Student ID
											</th>
											<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
												Name
											</th>
											<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
												Course/Year
											</th>
											<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
												Attendances
											</th>
											<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
												Rate
											</th>
										</tr>
									</thead>
									<tbody>
										{leaderboard.map((entry, i) => (
											<tr
												key={entry.studentId}
												className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] motion-safe:opacity-0 motion-safe:animate-[fadeIn_0.4s_ease-out_forwards]"
												style={{ animationDelay: `${i * 40}ms` }}
											>
												<td className="py-3 px-3 text-white/40 font-mono text-xs">{i + 1}</td>
												<td className="py-3 px-3 text-white/70 font-mono text-xs">
													{entry.studentId}
												</td>
												<td className="py-3 px-3 text-white/80 font-medium">{entry.name || '—'}</td>
												<td className="py-3 px-3 text-white/50 text-xs">
													{entry.course ? `${entry.course}/${entry.year}` : '—'}
												</td>
												<td className="py-3 px-3 text-white/60 tabular-nums">
													{entry.totalAttendances}
												</td>
												<td className="py-3 px-3">
													<span
														className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
															entry.checkInRate >= 80
																? 'text-emerald-400 bg-emerald-400/10'
																: entry.checkInRate >= 50
																	? 'text-amber-400 bg-amber-400/10'
																	: 'text-red-400 bg-red-400/10'
														}`}
													>
														{entry.checkInRate}%
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-12 text-white/20">
								<Users className="w-10 h-10 mb-2" />
								<p className="text-sm">No leaderboard data yet</p>
							</div>
						)}
					</div>

					{/* Completion Rates */}
					<CompletionRatesTable data={eventBreakdown ?? []} />
				</div>
			</div>

			{/* Event Picker Modal */}
			<EventPickerModal
				opened={eventPickerOpen}
				onClose={() => setEventPickerOpen(false)}
				selectedEventId={selectedEventId}
				onSelect={handleEventSelect}
			/>
		</div>
	);
}
