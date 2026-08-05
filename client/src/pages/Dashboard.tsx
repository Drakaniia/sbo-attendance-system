import { useQuery } from '@tanstack/react-query';
import {
	CalendarDays,
	Users,
	ClipboardCheck,
	Activity,
	Clock,
	UserCheck,
	AlertTriangle,
} from 'lucide-react';
import Header from '../components/ui/header';
import LiveClock from '../components/LiveClock';
import { QUERY_KEYS } from '../constants';
import {
	fetchDashboardStats,
	fetchEventAttendanceData,
	fetchCourseDistribution,
	fetchRecentActivity,
	fetchAttendanceTrend,
} from '../api/dashboard';
import { StatCard } from '../components/charts/StatCard';
import { DashboardBarChart } from '../components/charts/DashboardBarChart';
import { DashboardAreaChart } from '../components/charts/DashboardAreaChart';
import { DashboardPieChart } from '../components/charts/DashboardPieChart';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const DONUT_COLORS = [
	'#3b82f6',
	'#10b981',
	'#f59e0b',
	'#ef4444',
	'#8b5cf6',
	'#ec4899',
	'#06b6d4',
	'#f97316',
];

const EVENT_COLORS = {
	checkIns: '#3b82f6',
	checkOuts: '#10b981',
};

const TREND_COLORS = {
	checkIns: '#3b82f6',
	checkOuts: '#10b981',
	total: '#8b5cf6',
};

export default function Dashboard() {
	const {
		data: stats,
		isError: statsError,
		refetch: refetchStats,
	} = useQuery({
		queryFn: fetchDashboardStats,
		queryKey: [QUERY_KEYS.DASHBOARD_STATS],
		staleTime: 30_000,
	});

	const {
		data: eventAttendance,
		isError: eventError,
		refetch: refetchEvent,
	} = useQuery({
		queryFn: fetchEventAttendanceData,
		queryKey: [QUERY_KEYS.DASHBOARD_EVENT_ATTENDANCE],
		staleTime: 30_000,
	});

	const {
		data: courseDistribution,
		isError: courseError,
		refetch: refetchCourse,
	} = useQuery({
		queryFn: fetchCourseDistribution,
		queryKey: [QUERY_KEYS.DASHBOARD_COURSE_DISTRIBUTION],
		staleTime: 60_000,
	});

	const {
		data: recentActivity,
		isError: activityError,
		refetch: refetchActivity,
	} = useQuery({
		queryFn: () => fetchRecentActivity(6),
		queryKey: [QUERY_KEYS.DASHBOARD_RECENT_ACTIVITY],
		staleTime: 15_000,
		refetchInterval: 30_000,
	});

	const {
		data: attendanceTrend,
		isError: trendError,
		refetch: refetchTrend,
	} = useQuery({
		queryFn: () => fetchAttendanceTrend(14),
		queryKey: [QUERY_KEYS.DASHBOARD_ATTENDANCE_TREND],
		staleTime: 30_000,
	});

	const hasErrors = statsError || eventError || courseError || activityError || trendError;

	const retry = () => {
		refetchStats();
		refetchEvent();
		refetchCourse();
		refetchActivity();
		refetchTrend();
	};

	const eventChartData =
		eventAttendance?.map((e) => ({
			name:
				e.title.length > 16
					? e.title.slice(0, 14) + '...'
					: e.title,
			'Check-ins': e.checkIns,
			'Check-outs': e.checkOuts,
		})) ?? [];

	const courseChartData =
		courseDistribution?.map((c) => ({
			name: c.course,
			value: c.students,
		})) ?? [];

	const trendChartData =
		attendanceTrend?.map((t) => ({
			date: format(new Date(t.date), 'MMM d'),
			'Check-ins': t.checkIns,
			'Check-outs': t.checkOuts,
		})) ?? [];

	return (
		<div className='flex flex-col gap-6 pb-8 -mx-5 -mt-5 px-5'>
			{/* Error Banner */}
			{hasErrors && (
				<div className='rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-5 py-3 flex items-center justify-between gap-3 text-sm text-red-300 motion-safe:animate-[fadeIn_0.4s_ease-out_forwards]'>
					<div className='flex items-center gap-3'>
						<AlertTriangle className='w-4 h-4 shrink-0' />
						Some data could not be loaded. Showing available information only.
					</div>
					<button
						onClick={retry}
						className='shrink-0 px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/20 text-red-300 text-xs font-medium transition-[background-color,transform] duration-150 ease-apple-out hover:bg-red-500/25 active:scale-[0.97]'
					>
						Retry
					</button>
				</div>
			)}

			{/* Sticky Toolbar — translucent chrome, content scrolls beneath.
			    -top-5 compensates the section's 20px top padding so the bar pins flush at the viewport top. */}
			<header className='sticky -top-5 z-20 glass-heavy pt-5 pb-4'>
				<div className='flex items-center justify-between'>
					<div>
						<Header className='!text-2xl !tracking-tight'>
							Dashboard Overview
						</Header>
						<p className='text-white/40 text-sm mt-1'>
							{format(new Date(), 'EEEE, MMMM d, yyyy')} — Real-time
							attendance insights
						</p>
					</div>
					<div className='hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-white/60'>
						<span className='relative flex w-2 h-2'>
							<span className='absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping' />
							<span className='relative inline-flex w-2 h-2 rounded-full bg-emerald-400' />
						</span>
						<LiveClock
							format='12'
							showSeconds
							className='tabular-nums text-white/60'
						/>
					</div>
				</div>
			</header>

			{/* Stat Cards Grid */}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'>
				<StatCard
					title='Total Events'
					value={stats?.totalEvents ?? 0}
					icon={CalendarDays}
					color='#3b82f6'
					delay={0}
				/>
				<StatCard
					title='Active Events'
					value={stats?.activeEvents ?? 0}
					icon={Activity}
					color='#10b981'
					trend={stats && stats.activeEvents > 0 ? 'up' : 'neutral'}
					trendValue={
						stats
							? `${Math.round((stats.activeEvents / Math.max(stats.totalEvents, 1)) * 100)}% of total`
							: undefined
					}
					delay={60}
				/>
				<StatCard
					title='Total Students'
					value={stats?.totalStudents ?? 0}
					icon={Users}
					color='#8b5cf6'
					delay={120}
				/>
				<StatCard
					title='Total Records'
					value={stats?.totalAttendances ?? 0}
					icon={ClipboardCheck}
					color='#f59e0b'
					delay={180}
				/>
				<StatCard
					title='Attendance Rate'
					value={`${stats?.attendanceRate ?? 0}%`}
					icon={UserCheck}
					color='#ec4899'
					trend={
						stats && stats.attendanceRate >= 70
							? 'up'
							: stats && stats.attendanceRate >= 40
								? 'neutral'
								: 'down'
					}
					trendValue='check-out rate'
					delay={240}
				/>
			</div>

			{/* Charts Row */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
				{/* Event Attendance Bar Chart */}
				<div className='glass glass-hover rounded-2xl p-5'>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<h3 className='text-base font-semibold text-white tracking-tight'>
								Event Attendance
							</h3>
							<p className='text-xs text-white/30 mt-0.5'>
								Check-ins vs Check-outs per event
							</p>
						</div>
						<div className='flex items-center gap-3 text-xs'>
							<div className='flex items-center gap-1.5'>
								<div
									className='w-2.5 h-2.5 rounded-sm'
									style={{
										background: EVENT_COLORS.checkIns,
									}}
								/>
								<span className='text-white/50'>In</span>
							</div>
							<div className='flex items-center gap-1.5'>
								<div
									className='w-2.5 h-2.5 rounded-sm'
									style={{
										background: EVENT_COLORS.checkOuts,
									}}
								/>
								<span className='text-white/50'>Out</span>
							</div>
						</div>
					</div>
					<DashboardBarChart
						data={eventChartData}
						dataKeys={[
							{
								key: 'Check-ins',
								color: EVENT_COLORS.checkIns,
								name: 'Check-ins',
							},
							{
								key: 'Check-outs',
								color: EVENT_COLORS.checkOuts,
								name: 'Check-outs',
							},
						]}
						xKey='name'
						height={280}
					/>
				</div>

				{/* Course Distribution Donut */}
				<div className='glass glass-hover rounded-2xl p-5'>
					<div className='mb-2'>
						<h3 className='text-base font-semibold text-white tracking-tight'>
							Course Distribution
						</h3>
						<p className='text-xs text-white/30 mt-0.5'>
							Students enrolled per course
						</p>
					</div>
					<DashboardPieChart
						data={courseChartData}
						colors={DONUT_COLORS}
						height={290}
						innerRadius={60}
						outerRadius={105}
					/>
				</div>
			</div>

			{/* Attendance Trend Area Chart */}
			<div className='glass glass-hover rounded-2xl p-5'>
				<div className='flex items-center justify-between mb-4'>
					<div>
						<h3 className='text-base font-semibold text-white tracking-tight'>
							Attendance Trend
						</h3>
						<p className='text-xs text-white/30 mt-0.5'>
							Daily check-ins & check-outs (14 days)
						</p>
					</div>
					<div className='flex items-center gap-3 text-xs'>
						<div className='flex items-center gap-1.5'>
							<div
								className='w-2.5 h-2.5 rounded-sm'
								style={{ background: TREND_COLORS.checkIns }}
							/>
							<span className='text-white/50'>Check-ins</span>
						</div>
						<div className='flex items-center gap-1.5'>
							<div
								className='w-2.5 h-2.5 rounded-sm'
								style={{ background: TREND_COLORS.checkOuts }}
							/>
							<span className='text-white/50'>Check-outs</span>
						</div>
					</div>
				</div>
				<DashboardAreaChart
					data={trendChartData}
					dataKeys={[
						{
							key: 'Check-ins',
							color: TREND_COLORS.checkIns,
							name: 'Check-ins',
						},
						{
							key: 'Check-outs',
							color: TREND_COLORS.checkOuts,
							name: 'Check-outs',
						},
					]}
					xKey='date'
					height={280}
					curveType='monotone'
					gradientFrom={TREND_COLORS.checkIns}
					gradientTo={TREND_COLORS.checkOuts}
				/>
			</div>

			{/* Recent Activity Feed */}
			<div className='glass glass-hover rounded-2xl p-5'>
				<div className='flex items-center justify-between mb-4'>
					<div>
						<h3 className='text-base font-semibold text-white tracking-tight'>
							Recent Activity
						</h3>
						<p className='text-xs text-white/30 mt-0.5'>
							Latest attendance records across all events
						</p>
					</div>
					<Clock className='w-4 h-4 text-white/30' />
				</div>

				{recentActivity && recentActivity.length > 0 ? (
					<div className='overflow-x-auto'>
						<table className='w-full text-sm'>
							<thead>
								<tr className='border-b border-white/[0.06]'>
									<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
										Student ID
									</th>
									<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
										Name
									</th>
									<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
										Event
									</th>
									<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
										Time In
									</th>
									<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
										Time Out
									</th>
									<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
										Status
									</th>
								</tr>
							</thead>
							<tbody>
								{recentActivity.map((activity, i) => {
									const fullName =
										`${activity.student?.firstname ?? ''} ${activity.student?.lastname ?? ''}`.trim() ||
										'N/A';
									const hasTimeIn = !!activity.timeIn;
									const hasTimeOut = !!activity.timeOut;
									const status = hasTimeIn && hasTimeOut
										? 'Complete'
										: hasTimeIn
											? 'Checked In'
											: hasTimeOut
												? 'Checked Out'
												: 'Pending';

									const statusColor =
										status === 'Complete'
											? 'text-emerald-400 bg-emerald-400/10'
											: status === 'Checked In'
												? 'text-blue-400 bg-blue-400/10'
												: status === 'Checked Out'
													? 'text-amber-400 bg-amber-400/10'
													: 'text-white/30 bg-white/[0.04]';

									return (
										<tr
											key={activity._id}
											className={cn(
												'border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]',
												'motion-safe:opacity-0 motion-safe:animate-[fadeIn_0.4s_ease-out_forwards]'
											)}
											style={{
												animationDelay: `${i * 60}ms`,
											}}
										>
											<td className='py-3 px-3 text-white/70 font-mono text-xs'>
												{activity.studentID}
											</td>
											<td className='py-3 px-3 text-white/80 font-medium'>
												{fullName}
											</td>
											<td className='py-3 px-3 text-white/50 text-xs'>
												{activity.event?.title ?? 'N/A'}
											</td>
											<td className='py-3 px-3 text-white/60 font-mono text-xs'>
												{activity.timeIn
													? format(
															new Date(activity.timeIn),
															'hh:mm a'
														)
													: '—'}
											</td>
											<td className='py-3 px-3 text-white/60 font-mono text-xs'>
												{activity.timeOut
													? format(
															new Date(activity.timeOut),
															'hh:mm a'
														)
													: '—'}
											</td>
											<td className='py-3 px-3'>
												<span
													className={cn(
														'px-2 py-0.5 rounded-full text-[11px] font-medium',
														statusColor
													)}
												>
													{status}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<div className='flex flex-col items-center justify-center py-12 text-white/20'>
						<ClipboardCheck className='w-10 h-10 mb-2' />
						<p className='text-sm'>No recent activity yet</p>
					</div>
				)}
			</div>
		</div>
	);
}
