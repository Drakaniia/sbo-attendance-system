import mongoose from 'mongoose';
import { IStudent } from './student.model';
import { IUser } from './user.model';
import { IEvent } from './event.model';

const Schema = mongoose.Schema;

export type IAttendance = {
	event: IEvent;
	recordedBy: IUser;
	student: IStudent;
	studentID: string;
	timeIn: Date;
	timeOut: Date;
	createdAt: Date;
	updatedAt: Date;
};

const AttendanceSchema = new Schema<IAttendance>(
	{
		event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
		recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
		student: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
			required: true,
		},
		studentID: { type: String, required: true },
		timeIn: { type: Date },
		timeOut: { type: Date },
	},
	{
		timestamps: true,
	}
);

const AttendanceModel = mongoose.model<IAttendance>(
	'Attendance',
	AttendanceSchema
);

export default AttendanceModel;
