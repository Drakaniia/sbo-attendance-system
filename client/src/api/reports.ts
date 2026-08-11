import { ipc } from '../lib/ipc';

// ── Query params ────────────────────────────────────────────────────────

export type ReportsQuery = {
	startDate?: string;
	endDate?: string;
	eventId?: string;
};

// ── Response types ──────────────────────────────────────────────────────

export type ReportsStats = {
	totalCheckIns: number;
	totalCheckOuts: number;
	attendanceRate: number;
	uniqueStudents: number;
	activeEvents: number;
	totalRecords: number;
};

export type AttendanceTrendEntry = {
	date: string;
	checkIns: number;
	checkOuts: number;
	total: number;
};

export type EventBreakdownEntry = {
	eventId: string;
	title: string;
	type: string;
	startTime: string;
	checkIns: number;
	checkOuts: number;
	total: number;
};

export type CourseDistributionEntry = {
	course: string;
	students: number;
};

export type YearDistributionEntry = {
	year: number;
	students: number;
};

export type LeaderboardEntry = {
	studentId: string;
	name: string;
	course: string;
	year: number;
	totalAttendances: number;
	checkInRate: number;
};

export type HeatmapHourlyEntry = {
	hour: number;
	count: number;
};

export type HeatmapDailyEntry = {
	dayOfWeek: number; // 0=Mon … 6=Sun
	hour: number; // 0–23
	count: number;
};

// ── API functions ───────────────────────────────────────────────────────

/** 1. Aggregate stats for the selected date range and optional event. */
export const fetchReportsStats = async (query: ReportsQuery): Promise<ReportsStats> => {
	return ipc<ReportsStats>('reports_stats', { query });
};

/** 2. Daily attendance trend (check-ins + check-outs). */
export const fetchAttendanceTrend = async (
	query: ReportsQuery
): Promise<AttendanceTrendEntry[]> => {
	return ipc<AttendanceTrendEntry[]>('reports_attendance_trend', { query });
};

/** 3. Per-event breakdown with check-in/out counts. */
export const fetchEventBreakdown = async (
	query: Omit<ReportsQuery, 'eventId'>
): Promise<EventBreakdownEntry[]> => {
	return ipc<EventBreakdownEntry[]>('reports_event_breakdown', { query });
};

/** 4. Course distribution of students who attended. */
export const fetchCourseDistribution = async (
	query: ReportsQuery
): Promise<CourseDistributionEntry[]> => {
	return ipc<CourseDistributionEntry[]>('reports_course_distribution', { query });
};

/** 5. Year-level distribution of students who attended. */
export const fetchYearDistribution = async (
	query: ReportsQuery
): Promise<YearDistributionEntry[]> => {
	return ipc<YearDistributionEntry[]>('reports_year_distribution', { query });
};

/** 6. Student leaderboard ranked by attendance count. */
export const fetchLeaderboard = async (
	query: ReportsQuery & { limit?: number; sortBy?: 'total' | 'rate' }
): Promise<LeaderboardEntry[]> => {
	return ipc<LeaderboardEntry[]>('reports_leaderboard', { query });
};

/** 7. Heatmap data — hourly or daily×hourly attendance counts. */
export const fetchHeatmap = async (
	query: ReportsQuery & { mode?: 'hourly' | 'daily' }
): Promise<HeatmapHourlyEntry[] | HeatmapDailyEntry[]> => {
	return ipc<HeatmapHourlyEntry[] | HeatmapDailyEntry[]>('reports_heatmap', { query });
};

/** 8. Export the merged attendance workbook (.xlsx) for the selected range/event. */
export const downloadReportsExcel = async (query: ReportsQuery): Promise<void> => {
	await ipc<void>('export_reports_excel', { query });
};
