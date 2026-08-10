import axiosInstance from './axios-instance';
import type { APIResponse } from '../types/api-response';

export type ResetSummary = {
	students: number;
	events: number;
	attendance: number;
};

/** Delete all students, events, and attendance records. */
export const deleteAllData = async (): Promise<ResetSummary> => {
	const { data } = await axiosInstance.delete<APIResponse<ResetSummary>>(
		'/settings/data'
	);
	return data.data;
};
