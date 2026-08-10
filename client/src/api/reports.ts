import axiosInstance from './axios-instance';
import type { APIResponse } from '../types/api-response';

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

// ── Helpers ─────────────────────────────────────────────────────────────

function buildQuery(
	base: ReportsQuery,
	extra?: Record<string, string | number | undefined>
): string {
	const params = new URLSearchParams();
	const all = { ...base, ...extra };
	for (const [key, value] of Object.entries(all)) {
		if (value !== undefined && value !== '') {
			params.set(key, String(value));
		}
	}
	const qs = params.toString();
	return qs ? `?${qs}` : '';
}

// ── API functions ───────────────────────────────────────────────────────

/** 1. Aggregate stats for the selected date range and optional event. */
export const fetchReportsStats = async (query: ReportsQuery): Promise<ReportsStats> => {
	const { data } = await axiosInstance.get<APIResponse<ReportsStats>>(
		`/reports/stats${buildQuery(query)}`
	);
	return data.data;
};

/** 2. Daily attendance trend (check-ins + check-outs). */
export const fetchAttendanceTrend = async (
	query: ReportsQuery
): Promise<AttendanceTrendEntry[]> => {
	const { data } = await axiosInstance.get<APIResponse<AttendanceTrendEntry[]>>(
		`/reports/attendance-trend${buildQuery(query)}`
	);
	return data.data;
};

/** 3. Per-event breakdown with check-in/out counts. */
export const fetchEventBreakdown = async (
	query: Omit<ReportsQuery, 'eventId'>
): Promise<EventBreakdownEntry[]> => {
	const { data } = await axiosInstance.get<APIResponse<EventBreakdownEntry[]>>(
		`/reports/event-breakdown${buildQuery(query)}`
	);
	return data.data;
};

/** 4. Course distribution of students who attended. */
export const fetchCourseDistribution = async (
	query: ReportsQuery
): Promise<CourseDistributionEntry[]> => {
	const { data } = await axiosInstance.get<APIResponse<CourseDistributionEntry[]>>(
		`/reports/course-distribution${buildQuery(query)}`
	);
	return data.data;
};

/** 5. Year-level distribution of students who attended. */
export const fetchYearDistribution = async (
	query: ReportsQuery
): Promise<YearDistributionEntry[]> => {
	const { data } = await axiosInstance.get<APIResponse<YearDistributionEntry[]>>(
		`/reports/year-distribution${buildQuery(query)}`
	);
	return data.data;
};

/** 6. Student leaderboard ranked by attendance count. */
export const fetchLeaderboard = async (
	query: ReportsQuery & { limit?: number; sortBy?: 'total' | 'rate' }
): Promise<LeaderboardEntry[]> => {
	const { data } = await axiosInstance.get<APIResponse<LeaderboardEntry[]>>(
		`/reports/leaderboard${buildQuery(query)}`
	);
	return data.data;
};

/** 7. Heatmap data — hourly or daily×hourly attendance counts. */
export const fetchHeatmap = async (
	query: ReportsQuery & { mode?: 'hourly' | 'daily' }
): Promise<HeatmapHourlyEntry[] | HeatmapDailyEntry[]> => {
	const { data } = await axiosInstance.get<APIResponse<HeatmapHourlyEntry[] | HeatmapDailyEntry[]>>(
		`/reports/heatmap${buildQuery(query)}`
	);
	return data.data;
};

/** 8. Download merged attendance CSV for the selected date range/event. */
export const downloadReportsCsv = async (query: ReportsQuery): Promise<void> => {
	const response = await axiosInstance.get(`/reports/export-csv${buildQuery(query)}`, {
		responseType: 'blob',
	});

	const url = window.URL.createObjectURL(new Blob([response.data]));
	const link = document.createElement('a');
	link.href = url;
	link.setAttribute('download', 'seats-report-export.csv');
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
};
