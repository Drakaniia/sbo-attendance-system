import axiosInstance from './axiosInstance';
import type { APIResponse } from '../types/api-response';

export type DashboardStats = {
	totalEvents: number;
	activeEvents: number;
	archivedEvents: number;
	totalStudents: number;
	totalAttendances: number;
	totalCheckIns: number;
	totalCheckOuts: number;
	attendanceRate: number;
};

export type EventAttendanceData = {
	eventId: string;
	title: string;
	type: string;
	startTime: string;
	checkIns: number;
	checkOuts: number;
	total: number;
};

export type CourseDistributionData = {
	course: string;
	students: number;
};

export type RecentActivityData = {
	_id: string;
	studentID: string;
	timeIn: string | null;
	timeOut: string | null;
	updatedAt: string;
	student: {
		studentID: string;
		firstname: string;
		lastname: string;
		course: string;
		year: number;
	};
	event: {
		title: string;
		type: string;
	};
};

export type AttendanceTrendData = {
	date: string;
	checkIns: number;
	checkOuts: number;
	total: number;
};

export const fetchDashboardStats =
	async (): Promise<DashboardStats | null> => {
		const { data } = await axiosInstance.get<APIResponse<DashboardStats>>(
			'/dashboard/stats'
		);
		return data.data;
	};

export const fetchEventAttendanceData =
	async (): Promise<EventAttendanceData[]> => {
		const { data } = await axiosInstance.get<
			APIResponse<EventAttendanceData[]>
		>('/dashboard/event-attendance');
		return data.data;
	};

export const fetchCourseDistribution =
	async (): Promise<CourseDistributionData[]> => {
		const { data } = await axiosInstance.get<
			APIResponse<CourseDistributionData[]>
		>('/dashboard/course-distribution');
		return data.data;
	};

export const fetchRecentActivity = async (
	limit?: number
): Promise<RecentActivityData[]> => {
	const { data } = await axiosInstance.get<
		APIResponse<RecentActivityData[]>
	>(`/dashboard/recent-activity?limit=${limit ?? 8}`);
	return data.data;
};

export const fetchAttendanceTrend = async (
	days?: number
): Promise<AttendanceTrendData[]> => {
	const { data } = await axiosInstance.get<
		APIResponse<AttendanceTrendData[]>
	>(`/dashboard/attendance-trend?days=${days ?? 14}`);
	return data.data;
};
