import { ipc } from '../lib/ipc';

export type ResetSummary = {
	students: number;
	events: number;
	attendance: number;
};

/** Delete all students, events, and attendance records. */
export const deleteAllData = async (): Promise<ResetSummary> => {
	return ipc<ResetSummary>('reset_all_data');
};
