import mongoose from 'mongoose';

const Schema = mongoose.Schema;

export interface IStudent extends mongoose.Document {
	_id: string;
	studentID: string;
	firstname: string;
	lastname: string;
	middlename?: string;
	gender: string;
	course: string;
	year: number;
	email?: string;
	isPlaceholder: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export const StudentSchema = new Schema<IStudent>(
	{
		studentID: { type: String, required: true },
		firstname: { type: String, required: false },
		lastname: { type: String, required: false },
		middlename: { type: String, required: false },
		gender: { type: String, enum: ['M', 'F'], default: 'M', required: false },
		email: { type: String, required: false },
		year: { type: Number, required: true },
		course: { type: String, required: false },
		isPlaceholder: { type: Boolean, default: false, required: false },
	},
	{ timestamps: true }
);

StudentSchema.index({ '$**': 'text' });

StudentSchema.virtual('fullname').get(function () {
	return `${this.firstname} ${this.middlename} ${this.lastname}`;
});

const StudentModel = mongoose.model<IStudent>('Student', StudentSchema);
export default StudentModel;
