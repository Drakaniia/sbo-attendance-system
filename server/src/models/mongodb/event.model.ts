import mongoose from 'mongoose';

const Schema = mongoose.Schema;

export interface IEvent extends mongoose.Document {
	title: string;
	description: string;
	type: string;
	venue: string;
	startTime: Date;
	endTime: Date;
	createdBy: mongoose.Types.ObjectId;
	archived: boolean;
}

export const EventSchema = new Schema<IEvent>({
	title: { type: String, required: true },
	description: { type: String, required: true },
	type: { type: String, required: true },
	venue: { type: String, required: true },
	startTime: { type: Date, required: true },
	endTime: { type: Date, required: true },
	createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
	archived: {
		type: Boolean,
		default: false,
	},
});

const EventModel = mongoose.model<IEvent>('Event', EventSchema);
export default EventModel;
