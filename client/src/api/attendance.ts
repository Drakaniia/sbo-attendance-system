import type { Attendance } from '../types/attendance';
import type { PaginatedResult } from '../types/api-response';
import { ipc } from '../lib/ipc';

/** Fetch recent attendances across all events (global feed). */
export const fetchRecentAttendances = async (limit: number = 20): Promise<Attendance[]> => {
	return ipc<Attendance[]>('list_recent_attendances', { limit });
};

export const fetchRecentlyRecordedAttendances = async (
	eventID: string,
	page: number = 1,
	pageSize: number = 10
): Promise<PaginatedResult<Attendance[]>> => {
	try {
		return await ipc<PaginatedResult<Attendance[]>>('list_event_attendances', {
			eventId: eventID,
			page,
			pageSize,
		});
	} catch (error) {
		console.error('Failed to fetch recently recorded attendances for an event', error);
		throw error;
	}
};

export const getEventAttendanceSummary = async (
	eventID: string
): Promise<{
	totalCheckedIn: number;
	totalCheckedOut: number;
	rate: number;
}> => {
	try {
		return await ipc<{ totalCheckedIn: number; totalCheckedOut: number; rate: number }>(
			'event_attendance_summary',
			{ eventId: eventID }
		);
	} catch (error) {
		console.error('Failed to fetch event summary', error);
		throw error;
	}
};

export const updateAttendanceStudentID = async (
	attendanceID: string,
	studentID: string
): Promise<Attendance> => {
	try {
		return await ipc<Attendance>('update_attendance', {
			attendanceId: attendanceID,
			studentId: studentID,
		});
	} catch (error) {
		console.error('Failed to update attendance student ID', error);
		throw error;
	}
};

/** Record a time-in scan for an event. */
export const recordTimeIn = async (eventID: string, studentID: string): Promise<Attendance> => {
	return ipc<Attendance>('record_time_in', { eventId: eventID, studentId: studentID });
};

/** Record a time-out scan for an event. */
export const recordTimeOut = async (eventID: string, studentID: string): Promise<Attendance> => {
	return ipc<Attendance>('record_time_out', { eventId: eventID, studentId: studentID });
};

/** Export one event's attendance as a formatted Excel workbook (.xlsx). */
export const exportEventExcel = async (eventID: string): Promise<void> => {
	await ipc<void>('export_event_excel', { eventId: eventID });
};
