import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import {
	ArrowUpRight,
	ArrowsClockwise,
	Calendar,
	CalendarPlus,
	ChartBar,
	ClipboardText,
	ClockCounterClockwise,
	LockSimple,
	Scan,
	Student as StudentsIcon,
	TrendDown,
	TrendUp,
	Warning,
} from '@phosphor-icons/react';
import { QUERY_KEYS } from '../../constants';
import {
	fetchAttendanceTrend,
	fetchCourseDistribution,
	fetchDashboardStats,
	fetchEventAttendanceData,
	fetchRecentActivity,
} from '../../api/dashboard';
import { cn } from '../../lib/utils';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import PageHeader from '../../components/ui/PageHeader';
import PanelHeading from '../../components/ui/PanelHeading';
import MetricStrip from '../../components/ui/MetricStrip';
import Segmented from '../../components/ui/Segmented';
import AttendanceTrendChart from '../../components/charts/AttendanceTrendChart';
import EventAttendanceChart from '../../components/charts/EventAttendanceChart';
import CourseDonut from '../../components/charts/CourseDonut';
import CompletionRing from '../../components/charts/CompletionRing';
import ActivityFeed from './ActivityFeed';

const RANGE_OPTIONS = [
	{ value: 7, label: '7D' },
	{ value: 14, label: '14D' },
	{ value: 30, label: '30D' },
];

const CHECK_IN_COLOR = '#6e9bff';
const CHECK_OUT_COLOR = '#43d7b0';

function LegendDot({ color, children }: { color: string; children: ReactNode }) {
	return (
		<span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-white/35">
			<span className="h-[5px] w-[5px] rounded-full" style={{ background: color }} />
			{children}
		</span>
	);
}

export default function Dashboard() {
	const reduceMotion = useReducedMotion();
	const [days, setDays] = useState(14);
	const [refreshing, setRefreshing] = useState(false);

	const statsQuery = useQuery({
		queryFn: fetchDashboardStats,
		queryKey: [QUERY_KEYS.DASHBOARD_STATS],
		staleTime: 30_000,
	});

	const trendQuery = useQuery({
		queryFn: () => fetchAttendanceTrend(days),
		queryKey: [QUERY_KEYS.DASHBOARD_ATTENDANCE_TREND, days],
		staleTime: 30_000,
	});

	const eventsQuery = useQuery({
		queryFn: fetchEventAttendanceData,
		queryKey: [QUERY_KEYS.DASHBOARD_EVENT_ATTENDANCE],
		staleTime: 30_000,
	});

	const coursesQuery = useQuery({
		queryFn: fetchCourseDistribution,
		queryKey: [QUERY_KEYS.DASHBOARD_COURSE_DISTRIBUTION],
		staleTime: 60_000,
	});

	const activityQuery = useQuery({
		queryFn: () => fetchRecentActivity(6),
		queryKey: [QUERY_KEYS.DASHBOARD_RECENT_ACTIVITY],
		staleTime: 15_000,
		refetchInterval: 30_000,
	});

	const stats = statsQuery.data;
	const trend = useMemo(() => trendQuery.data ?? [], [trendQuery.data]);
	const events = eventsQuery.data ?? [];
	const courses = coursesQuery.data ?? [];

	const hasErrors = Boolean(
		statsQuery.isError ||
		trendQuery.isError ||
		eventsQuery.isError ||
		coursesQuery.isError ||
		activityQuery.isError
	);

	const firstLoad = (statsQuery.isLoading || trendQuery.isLoading) && trend.length === 0;

	const derived = useMemo(() => {
		const split = Math.floor(trend.length / 2);
		const previous = trend.slice(0, split).reduce((sum, point) => sum + point.checkIns, 0);
		const current = trend.slice(split).reduce((sum, point) => sum + point.checkIns, 0);
		const delta = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
		const windowCheckIns = trend.reduce((sum, point) => sum + point.checkIns, 0);
		const peak = trend.reduce(
			(best, point) => (point.checkIns > best.checkIns ? point : best),
			trend[0] ?? { date: '', checkIns: 0, checkOuts: 0, total: 0 }
		);
		const average = trend.length > 0 ? Math.round(windowCheckIns / trend.length) : 0;
		return { delta, windowCheckIns, peak, average };
	}, [trend]);

	const animatedTotal = useAnimatedNumber(derived.windowCheckIns);
	const checkIns = stats?.totalCheckIns ?? 0;
	const checkOuts = stats?.totalCheckOuts ?? 0;
	const totalEvents = stats?.totalEvents ?? 0;
	const openLoops = Math.max(checkIns - checkOuts, 0);
	const averagePerEvent =
		totalEvents > 0 ? Math.round((stats?.totalAttendances ?? 0) / totalEvents) : 0;

	const refreshAll = async () => {
		if (refreshing) return;
		setRefreshing(true);
		await Promise.allSettled([
			statsQuery.refetch(),
			trendQuery.refetch(),
			eventsQuery.refetch(),
			coursesQuery.refetch(),
			activityQuery.refetch(),
		]);
		window.setTimeout(() => setRefreshing(false), 350);
	};

	const deltaPositive = (derived.delta ?? 0) >= 0;

	return (
		<div className="flex flex-col gap-5 pb-4">
			<PageHeader
				eyebrow={
					<>
						<span>{format(new Date(), 'EEEE, MMMM d')}</span>
						<span className="h-[3px] w-[3px] rounded-full bg-white/20" />
						<span className="flex items-center gap-1.5 text-[#7ee8c9]/75">
							<span className="h-1 w-1 rounded-full bg-[#43d7b0]" />
							Live
						</span>
					</>
				}
				title="Overview"
				description="A live read on turnout, events, and the student roster."
				actions={
					<button
						type="button"
						onClick={refreshAll}
						className="control h-8 gap-1.5 px-2.5 text-[11.5px]"
						aria-label="Refresh dashboard data"
					>
						<ArrowsClockwise className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
						<span className="hidden sm:inline">Refresh</span>
					</button>
				}
			/>

			{hasErrors && (
				<div
					role="alert"
					className="flex items-center justify-between gap-4 rounded-2xl border border-[#f07c9a]/20 bg-[#f07c9a]/[0.06] px-4 py-3"
				>
					<div className="flex min-w-0 items-center gap-2.5">
						<Warning className="h-4 w-4 shrink-0 text-[#ff9dae]" />
						<p className="text-[12px] text-[#ffb3c2]/90">
							Some data couldn't be loaded. Showing what's available.
						</p>
					</div>
					<button
						type="button"
						onClick={refreshAll}
						className="control h-7 shrink-0 px-2.5 text-[11px]"
					>
						Retry
					</button>
				</div>
			)}

			{/* ── Hero: participation pulse + completion ───────────────── */}
			<section className="panel relative overflow-hidden">
				<div
					aria-hidden
					className="pointer-events-none absolute -left-24 -top-40 h-[420px] w-[560px] rounded-full bg-[#5b8def]/[0.075] blur-[90px]"
				/>

				<div className="relative grid xl:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
					{/* Pulse */}
					<div className="min-w-0 p-6 sm:p-7">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<p className="eyebrow">Participation pulse</p>
								<span className="rounded-full border border-white/[0.07] px-1.5 py-0.5 text-[9px] font-medium text-white/28">
									{days} days
								</span>
							</div>
							<Segmented
								options={RANGE_OPTIONS}
								value={days}
								onChange={setDays}
								ariaLabel="Trend range"
							/>
						</div>

						<div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
							<p className="numeric text-[46px] font-semibold leading-[0.92] tracking-display text-[#f5f5f7]">
								{firstLoad ? '—' : animatedTotal.toLocaleString()}
							</p>
							{!firstLoad && derived.delta !== null && (
								<div className="mb-1 flex items-center gap-2">
									<span
										className={cn(
											'inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[10.5px] font-semibold',
											deltaPositive
												? 'bg-[#43d7b0]/[0.10] text-[#7ee8c9]'
												: 'bg-[#f07c9a]/[0.10] text-[#ffb3c2]'
										)}
									>
										{deltaPositive ? (
											<TrendUp className="h-3 w-3" weight="bold" />
										) : (
											<TrendDown className="h-3 w-3" weight="bold" />
										)}
										{Math.abs(derived.delta)}%
									</span>
									<span className="text-[11px] text-white/28">vs previous period</span>
								</div>
							)}
						</div>
						<p className="mt-2 text-[11.5px] text-white/32">
							check-ins recorded across the last {trend.length || days} days
						</p>

						<div className="mt-4">
							{firstLoad ? (
								<div className="h-[250px] animate-pulse rounded-2xl bg-white/[0.025] sm:h-[280px] xl:h-[300px]" />
							) : (
								<AttendanceTrendChart
									data={trend}
									className="h-[250px] sm:h-[280px] xl:h-[300px]"
								/>
							)}
						</div>

						<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
							<LegendDot color={CHECK_IN_COLOR}>Check-ins</LegendDot>
							<LegendDot color={CHECK_OUT_COLOR}>Check-outs</LegendDot>
							<span className="ml-auto hidden text-[10.5px] text-white/22 sm:inline">
								Hover the chart to inspect a day
							</span>
						</div>
					</div>

					{/* Completion */}
					<div className="flex flex-col border-t border-white/[0.06] p-6 sm:p-7 xl:border-l xl:border-t-0">
						<div className="flex items-center justify-between">
							<p className="eyebrow">Loop closed</p>
							<span className="text-[10px] font-medium text-white/22">All time</span>
						</div>

						<div className="flex flex-1 items-center justify-center py-4">
							<CompletionRing
								rate={stats?.attendanceRate ?? 0}
								checkIns={checkIns}
								checkOuts={checkOuts}
							/>
						</div>

						<div className="hairline" />

						<dl className="mt-4 grid grid-cols-2 gap-5">
							<div>
								<dt className="eyebrow">Daily average</dt>
								<dd className="numeric mt-2 text-[19px] font-medium leading-none text-white/82">
									{derived.average.toLocaleString()}
									<span className="ml-1 text-[10.5px] font-normal text-white/28">/ day</span>
								</dd>
							</div>
							<div>
								<dt className="eyebrow">Busiest day</dt>
								<dd className="numeric mt-2 text-[19px] font-medium leading-none text-white/82">
									{derived.peak.date ? format(new Date(derived.peak.date), 'MMM d') : '—'}
								</dd>
								<p className="mt-1 text-[10.5px] text-white/28">
									{derived.peak.checkIns.toLocaleString()} check-ins
								</p>
							</div>
						</dl>
					</div>
				</div>
			</section>

			{/* ── Top-line metrics ─────────────────────────────────────── */}
			<MetricStrip
				items={[
					{
						label: 'Total events',
						value: totalEvents,
						icon: Calendar,
						accent: '#8fb4ff',
						hint: `${stats?.activeEvents ?? 0} active · ${stats?.archivedEvents ?? 0} archived`,
					},
					{
						label: 'Students',
						value: stats?.totalStudents ?? 0,
						icon: StudentsIcon,
						accent: '#cdc2ff',
						hint: `${courses.length} ${courses.length === 1 ? 'course' : 'courses'} represented`,
					},
					{
						label: 'Records',
						value: stats?.totalAttendances ?? 0,
						icon: ClipboardText,
						accent: '#9ff0e8',
						hint: `${averagePerEvent.toLocaleString()} per event on average`,
					},
					{
						label: 'Open loops',
						value: openLoops,
						icon: ClockCounterClockwise,
						accent: '#ffd79a',
						hint: 'Checked in, not yet out',
					},
				]}
			/>

			{/* ── Event turnout + course mix ───────────────────────────── */}
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
				<section className="panel flex min-w-0 flex-col p-6">
					<PanelHeading
						eyebrow="Turnout"
						title="Event attendance"
						action={
							<Link to="/admin/events" className="control h-7 shrink-0 px-2.5 text-[11px]">
								All events
								<ArrowUpRight className="h-3 w-3" />
							</Link>
						}
					/>
					<div className="mt-3 flex items-center gap-4">
						<LegendDot color={CHECK_IN_COLOR}>Checked in</LegendDot>
						<LegendDot color={CHECK_OUT_COLOR}>Checked out</LegendDot>
					</div>
					<div className="mt-3 h-[310px]">
						<EventAttendanceChart events={events} className="h-full" />
					</div>
				</section>

				<section className="panel flex min-w-0 flex-col p-6">
					<PanelHeading
						eyebrow="Roster"
						title="Course mix"
						action={
							<Link to="/admin/students" className="control h-7 shrink-0 px-2.5 text-[11px]">
								Students
								<ArrowUpRight className="h-3 w-3" />
							</Link>
						}
					/>
					<div className="mt-5 flex flex-1 items-center">
						<div className="w-full">
							<CourseDonut data={courses} />
						</div>
					</div>
				</section>
			</div>

			{/* ── Activity + desk actions ───────────────────────────────── */}
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
				<section className="panel flex min-w-0 flex-col p-6">
					<PanelHeading
						eyebrow="Live feed"
						title="Recent activity"
						action={
							<Link to="/admin/attendance" className="control h-7 shrink-0 px-2.5 text-[11px]">
								View log
								<ArrowUpRight className="h-3 w-3" />
							</Link>
						}
					/>
					<div className="mt-2.5">
						<ActivityFeed activities={activityQuery.data} />
					</div>
				</section>

				<motion.section
					initial={reduceMotion ? false : { opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={
						reduceMotion
							? { duration: 0 }
							: { type: 'spring', bounce: 0, duration: 0.5, delay: 0.08 }
					}
					className="panel flex min-w-0 flex-col p-6"
				>
					<PanelHeading eyebrow="Desk" title="Quick actions" />

					<div className="mt-4 space-y-0.5">
						<DeskAction
							to="/admin/events"
							icon={Scan}
							title="Run a check-in"
							description="Choose an event and scan student IDs"
							accent="#8fb4ff"
						/>
						<DeskAction
							to="/admin/events"
							icon={CalendarPlus}
							title="Create an event"
							description="Set the venue, schedule, and type"
							accent="#cdc2ff"
						/>
						<DeskAction
							to="/admin/reports"
							icon={ChartBar}
							title="Open reports"
							description="Break down turnout, courses, and peaks"
							accent="#9ff0e8"
						/>
					</div>

					<div className="mt-auto pt-7">
						<div className="hairline" />
						<div className="mt-4 flex items-start gap-2.5">
							<LockSimple className="mt-px h-3.5 w-3.5 shrink-0 text-white/22" />
							<p className="text-[11px] leading-relaxed text-white/28">
								Attendance stays on this device. No account, no cloud sync.
							</p>
						</div>
					</div>
				</motion.section>
			</div>
		</div>
	);
}

function DeskAction({
	to,
	icon: Icon,
	title,
	description,
	accent,
}: {
	to: string;
	icon: React.ElementType;
	title: string;
	description: string;
	accent: string;
}) {
	return (
		<Link
			to={to}
			className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 ease-apple-out hover:bg-white/[0.035] focus-visible:bg-white/[0.05] focus-visible:outline-none"
		>
			<span
				className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-white/[0.06] bg-white/[0.035] transition-colors duration-150 group-hover:border-white/[0.1]"
				style={{ color: accent }}
			>
				<Icon className="h-4 w-4" strokeWidth={2} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-[12.5px] font-medium text-white/72 group-hover:text-white/90">
					{title}
				</span>
				<span className="mt-0.5 block truncate text-[11px] text-white/28">{description}</span>
			</span>
			<ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/12 transition-[color,transform] duration-200 ease-apple-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/40" />
		</Link>
	);
}
