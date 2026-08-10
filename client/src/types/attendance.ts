import type { Event } from './event';
import type { Student } from './student';
import type { User } from './user';

export type Attendance = {
	_id: string;
	event?: Event | null;
	recordedBy?: User | null;
	student?: Student | null;
	studentID: string;
	timeIn: string | null;
	timeOut: string | null;
	createdAt: string;
	updatedAt: string;
};
