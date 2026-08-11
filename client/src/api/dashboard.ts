import { ipc } from '../lib/ipc';

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

export const fetchDashboardStats = async (): Promise<DashboardStats | null> => {
	return ipc<DashboardStats>('dashboard_stats');
};

export const fetchEventAttendanceData = async (): Promise<EventAttendanceData[]> => {
	return ipc<EventAttendanceData[]>('dashboard_event_attendance');
};

export const fetchCourseDistribution = async (): Promise<CourseDistributionData[]> => {
	return ipc<CourseDistributionData[]>('dashboard_course_distribution');
};

export const fetchRecentActivity = async (limit?: number): Promise<RecentActivityData[]> => {
	return ipc<RecentActivityData[]>('dashboard_recent_activity', { limit });
};

export const fetchAttendanceTrend = async (days?: number): Promise<AttendanceTrendData[]> => {
	return ipc<AttendanceTrendData[]>('dashboard_attendance_trend', { days });
};
