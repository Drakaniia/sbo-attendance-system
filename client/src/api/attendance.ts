import type { Attendance } from '../types/attendance';
import type { APIPaginatedResponse } from '../types/api-response';
import axiosInstance from './axiosInstance';

export const fetchRecentlyRecordedAttendances = async (
	eventID: string,
	page: number = 1,
	pageSize: number = 10
): Promise<APIPaginatedResponse<Attendance[]>> => {
	try {
		const { data } = await axiosInstance.get<APIPaginatedResponse<Attendance[]>>(
			`/attendance/event/${eventID}?page=${page}&pageSize=${pageSize}`
		);

		return data;
	} catch (error) {
		console.error(
			'Failed to fetch recently recorded attendances for an event',
			error
		);
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
		const { data } = await axiosInstance.get(`/event/${eventID}/summary`);

		return data.data;
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
		const { data } = await axiosInstance.patch(
			`/attendance/${attendanceID}`,
			{ studentID }
		);
		return data.data;
	} catch (error) {
		console.error('Failed to update attendance student ID', error);
		throw error;
	}
};
