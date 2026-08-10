import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
	fetchReportsStats,
	fetchAttendanceTrend,
	fetchEventBreakdown,
	fetchCourseDistribution,
	fetchYearDistribution,
	fetchLeaderboard,
	fetchHeatmap,
	type ReportsStats,
	type AttendanceTrendEntry,
	type EventBreakdownEntry,
	type CourseDistributionEntry,
	type YearDistributionEntry,
	type LeaderboardEntry,
	type HeatmapHourlyEntry,
	type HeatmapDailyEntry,
} from '../api/reports';
import { QUERY_KEYS } from '../constants';
import type { DateRange } from '../components/reports/DateRangePicker';
import type { Event } from '../types/event';

export const DEFAULT_DATE_RANGE: DateRange = { preset: 'all' };

export const DONUT_COLORS = [
	'#6366f1',
	'#818cf8',
	'#a5b4fc',
	'#c7d2fe',
	'#e0e7ff',
	'#ddd6fe',
	'#c4b5fd',
	'#a78bfa',
];

export const YEAR_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

export const TREND_COLORS = {
	checkIns: '#6366f1',
	checkOuts: '#a78bfa',
};

export type ReportsData = {
	sidebarOpen: boolean;
	setSidebarOpen: Dispatch<SetStateAction<boolean>>;
	dateRange: DateRange;
	selectedEventId: string | null;
	selectedEventTitle: string | undefined;
	eventPickerOpen: boolean;
	setEventPickerOpen: Dispatch<SetStateAction<boolean>>;
	isRefreshing: boolean;

	stats: ReportsStats | undefined;
	statsLoading: boolean;
	attendanceTrend: AttendanceTrendEntry[] | undefined;
	eventBreakdown: EventBreakdownEntry[] | undefined;
	courseDistribution: CourseDistributionEntry[] | undefined;
	yearDistribution: YearDistributionEntry[] | undefined;
	leaderboard: LeaderboardEntry[] | undefined;
	leaderboardLoading: boolean;
	heatmapHourly: HeatmapHourlyEntry[] | HeatmapDailyEntry[] | undefined;
	heatmapDaily: HeatmapHourlyEntry[] | HeatmapDailyEntry[] | undefined;
	heatmapIsLoading: boolean;

	trendChartData: { date: string; CheckIns: number; CheckOuts: number }[];
	eventChartData: { name: string; CheckIns: number; CheckOuts: number }[];
	courseChartData: { name: string; value: number }[];
	yearChartData: { name: string; value: number }[];

	handleClearFilters: () => void;
	handleEventSelect: (event: Event | null) => void;
	handleDateRangeChange: (range: DateRange) => void;
};

export function useReportsData(): ReportsData {
	const queryClient = useQueryClient();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>();
	const [eventPickerOpen, setEventPickerOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Track whether date range is currently being interacted with
	const isFilteringRef = useRef(false);

	// ── Derive stable date params ────────────────────
	const startDate =
		dateRange.preset !== 'all' && 'startDate' in dateRange ? dateRange.startDate : undefined;
	const endDate =
		dateRange.preset !== 'all' && 'startDate' in dateRange ? dateRange.endDate : undefined;

	// ── Data fetching ────────────────────────────────
	const { data: stats, isLoading: statsLoading } = useQuery({
		queryKey: [QUERY_KEYS.REPORTS_STATS, startDate, endDate, selectedEventId],
		queryFn: () =>
			fetchReportsStats({
				startDate,
				endDate,
				eventId: selectedEventId ?? undefined,
			}),
		staleTime: 30_000,
	});

	const { data: attendanceTrend } = useQuery({
		queryKey: [QUERY_KEYS.REPORTS_ATTENDANCE_TREND, startDate, endDate, selectedEventId],
		queryFn: () =>
			fetchAttendanceTrend({
				startDate,
				endDate,
				eventId: selectedEventId ?? undefined,
			}),
		staleTime: 30_000,
	});

	const { data: eventBreakdown } = useQuery({
		queryKey: [QUERY_KEYS.REPORTS_EVENT_BREAKDOWN, startDate, endDate],
		queryFn: () => fetchEventBreakdown({ startDate, endDate }),
		staleTime: 30_000,
	});

	const { data: courseDistribution } = useQuery({
		queryKey: [QUERY_KEYS.REPORTS_COURSE_DISTRIBUTION, startDate, endDate, selectedEventId],
		queryFn: () =>
			fetchCourseDistribution({
				startDate,
				endDate,
				eventId: selectedEventId ?? undefined,
			}),
		staleTime: 60_000,
	});

	const { data: yearDistribution } = useQuery({
		queryKey: [QUERY_KEYS.REPORTS_YEAR_DISTRIBUTION, startDate, endDate, selectedEventId],
		queryFn: () =>
			fetchYearDistribution({
				startDate,
				endDate,
				eventId: selectedEventId ?? undefined,
			}),
		staleTime: 60_000,
	});

	const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
		queryKey: [QUERY_KEYS.REPORTS_LEADERBOARD, startDate, endDate, selectedEventId],
		queryFn: () =>
			fetchLeaderboard({
				startDate,
				endDate,
				eventId: selectedEventId ?? undefined,
				limit: 50,
			}),
		staleTime: 30_000,
	});

	const { data: heatmapHourly, isLoading: heatmapHourlyLoading } = useQuery({
		queryKey: [QUERY_KEYS.REPORTS_HEATMAP, 'hourly', startDate, endDate, selectedEventId],
		queryFn: () =>
			fetchHeatmap({
				startDate,
				endDate,
				eventId: selectedEventId ?? undefined,
				mode: 'hourly',
			}),
		staleTime: 30_000,
	});

	const { data: heatmapDaily, isLoading: heatmapDailyLoading } = useQuery({
		queryKey: [QUERY_KEYS.REPORTS_HEATMAP, 'daily', startDate, endDate, selectedEventId],
		queryFn: () =>
			fetchHeatmap({
				startDate,
				endDate,
				eventId: selectedEventId ?? undefined,
				mode: 'daily',
			}),
		staleTime: 30_000,
	});

	// ── Auto-refresh (60s) ──────────────────────────
	useEffect(() => {
		const interval = setInterval(() => {
			// Skip refresh while user is interacting with filters
			if (isFilteringRef.current) return;

			setIsRefreshing(true);
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS_STATS] });
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS_ATTENDANCE_TREND] });
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS_EVENT_BREAKDOWN] });
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS_COURSE_DISTRIBUTION] });
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS_YEAR_DISTRIBUTION] });
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS_LEADERBOARD] });
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS_HEATMAP] });

			// Brief pulse animation indicator
			setTimeout(() => setIsRefreshing(false), 600);
		}, 60_000);

		return () => clearInterval(interval);
	}, [queryClient]);

	// ── Chart data transformations ───────────────────
	const trendChartData =
		attendanceTrend?.map((t) => ({
			date: format(new Date(t.date), 'MMM d'),
			CheckIns: t.checkIns,
			CheckOuts: t.checkOuts,
		})) ?? [];

	const eventChartData =
		eventBreakdown?.map((e) => ({
			name: e.title.length > 16 ? e.title.slice(0, 14) + '...' : e.title,
			CheckIns: e.checkIns,
			CheckOuts: e.checkOuts,
		})) ?? [];

	const courseChartData =
		courseDistribution?.map((c) => ({
			name: c.course,
			value: c.students,
		})) ?? [];

	const yearChartData =
		yearDistribution?.map((y) => ({
			name: `Year ${y.year}`,
			value: y.students,
		})) ?? [];

	// ── Handlers ─────────────────────────────────────
	const handleClearFilters = useCallback(() => {
		setDateRange(DEFAULT_DATE_RANGE);
		setSelectedEventId(null);
		setSelectedEventTitle(undefined);
	}, []);

	const handleEventSelect = useCallback((event: Event | null) => {
		if (event) {
			setSelectedEventId(event._id);
			setSelectedEventTitle(event.title);
		} else {
			setSelectedEventId(null);
			setSelectedEventTitle(undefined);
		}
	}, []);

	const handleDateRangeChange = useCallback((range: DateRange) => {
		isFilteringRef.current = true;
		setDateRange(range);
		// Reset the flag after a short delay so the refresh doesn't fire mid-filter
		setTimeout(() => {
			isFilteringRef.current = false;
		}, 500);
	}, []);

	const heatmapIsLoading = heatmapHourlyLoading || heatmapDailyLoading;

	return {
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
		attendanceTrend,
		eventBreakdown,
		courseDistribution,
		yearDistribution,
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
	};
}
