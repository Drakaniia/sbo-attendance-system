import asyncHandler from 'express-async-handler';
import { createEventSchema } from '../schemas/event.schema';
import EventModel from '../models/mongodb/event.model';
import CustomResponse from '../models/utils/response';
import appAssert from '../errors/app-assert';
import { BAD_REQUEST, NO_CONTENT, NOT_FOUND } from '../constants/http';
import AttendanceModel from '../models/mongodb/attendance.model';

/**
 * @route GET /api/v1/event
 */
export const getEventsHandler = asyncHandler(async (req, res) => {
	const events = await EventModel.find({ archived: false });
	res.json(new CustomResponse(true, events, 'Events fetched successfully'));
});

/**
 * @route GET /api/v1/event/:eventID
 */
export const getSingleEvent = asyncHandler(async (req, res) => {
	const { eventID } = req.params;
	const event = await EventModel.findById(eventID);
	appAssert(event, NOT_FOUND, 'Event not found');

	res.json(new CustomResponse(true, event, 'Event found'));
});

/**
 * @route POST /api/v1/event
 */
export const createEventHandler = asyncHandler(async (req, res) => {
	const body = createEventSchema.parse(req.body);

	const event = await EventModel.create({ ...body, createdBy: (req as any).user?._id });
	res.json(new CustomResponse(true, event, 'Event created successfully'));
});

/**
 * @route PUT /api/v1/event/:eventID
 */
export const updateEventHandler = asyncHandler(async (req, res) => {
	const body = createEventSchema.parse(req.body);
	const eventID = req.params.eventID;

	const event = await EventModel.findByIdAndUpdate(eventID, body, {
		new: true,
	});

	appAssert(event, BAD_REQUEST, 'Event not found');

	res.json(new CustomResponse(true, event, 'Event updated successfully'));
});

/**
 * @route DELETE /api/v1/event/:eventID
 */
export const deleteEventHandler = asyncHandler(async (req, res) => {
	const eventID = req.params.eventID;

	const event = await EventModel.findByIdAndDelete(eventID);
	appAssert(event, NO_CONTENT, 'Event not found');

	const attendaces = await AttendanceModel.find({ event: eventID });
	appAssert(!attendaces, BAD_REQUEST, 'Event has attendances');

	res.json(new CustomResponse(true, event, 'Event deleted successfully'));
});

/**
 * @route PATCH /api/v1/event/:eventID/archive
 */
export const archiveEventHandler = asyncHandler(async (req, res) => {
	const eventID = req.params.eventID;

	// Find and mark as archived
	const event = await EventModel.findByIdAndUpdate(
		eventID,
		{ archived: true },
		{ new: true }
	);

	appAssert(event, 404, 'Event not found');

	res.json(new CustomResponse(true, event, 'Event archived successfully'));
});

/**
 * @route PATCH /api/v1/event/:eventID/unarchive
 */
export const unarchiveEventHandler = asyncHandler(async (req, res) => {
	const eventID = req.params.eventID;

	const event = await EventModel.findByIdAndUpdate(
		eventID,
		{ archived: false },
		{ new: true }
	);

	appAssert(event, 404, 'Event not found');

	res.json(new CustomResponse(true, event, 'Event unarchived successfully'));
});

/**
 * @route GET /api/v1/event/:eventID/summary
 */
export const getEventAttendanceSummary = asyncHandler(async (req, res) => {
	const { eventID } = req.params;
	const event = await EventModel.findById(eventID);
	appAssert(event, NOT_FOUND, 'Event not found');

	const totalCheckedIn = await AttendanceModel.countDocuments({
		event: eventID,
		timeIn: { $ne: null },
	});

	const totalCheckedOut = await AttendanceModel.countDocuments({
		event: eventID,
		timeOut: { $ne: null },
	});

	let rate = 0;

	if (totalCheckedIn > 0) {
		rate = (totalCheckedOut / totalCheckedIn) * 100;
	}

	res.json(
		new CustomResponse(
			true,
			{ totalCheckedIn, totalCheckedOut, rate },
			'Event summary fetched successfully'
		)
	);
});
