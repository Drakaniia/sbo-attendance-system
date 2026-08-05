import asyncHandler from 'express-async-handler';
import AttendanceModel from '../models/mongodb/attendance.model';
import CustomResponse, {
	CustomPaginatedResponse,
} from '../models/utils/response';
import StudentModel from '../models/mongodb/student.model';
import appAssert from '../errors/app-assert';
import { AppErrorCodes } from '../constants';
import { BAD_REQUEST, NOT_FOUND } from '../constants/http';
import EventModel from '../models/mongodb/event.model';
import { differenceInMinutes, format } from 'date-fns';

const STUDENT_ID_LENGTH = 10;

/**
 * Find a student by ID, or auto-create a flagged placeholder when the
 * masterlist is not yet available (e.g. first-time barcode scans).
 */
const findOrCreateStudent = async (studentID: string) => {
	let student = await StudentModel.findOne({ studentID });
	if (!student) {
		student = await StudentModel.create({
			studentID,
			year: 1,
			firstname: '',
			lastname: '',
			course: '',
			isPlaceholder: true,
		});
	}
	return student;
};

/**
 * @route GET /api/v1/attendance - get recently recorded attendances
 */
export const getAttendanceHandler = asyncHandler(async (req, res) => {
	const { limit } = req.query;

	const attendances = await AttendanceModel.find().limit(
		parseInt(limit?.toString() ?? '10')
	);

	res.json(
		new CustomResponse(true, attendances, 'Attendances fetched successfully')
	);
});

/**
 * @route GET /api/v1/attendance/event/:eventID - Get recently recorded attendances of an event (paginated)
 */
export const getEventAttendanceHandler = asyncHandler(async (req, res) => {
	const { eventID } = req.params;
	const { page, pageSize } = req.query;

	const defaultPage = 1;
	const defaultPageSize = 10;

	const pageNum = page ? parseInt(page as string) : defaultPage;
	const pageSizeNum = pageSize ? parseInt(pageSize as string) : defaultPageSize;
	const skipAmount = (pageNum - 1) * pageSizeNum;

	const [attendances, total] = await Promise.all([
		AttendanceModel.find({ event: eventID })
			.skip(skipAmount)
			.limit(pageSizeNum)
			.populate('student')
			.populate('event')
			.sort({ updatedAt: -1 })
			.exec(),
		AttendanceModel.countDocuments({ event: eventID }),
	]);

	const totalPages = Math.ceil(total / pageSizeNum) || 1;
	const next =
		total > skipAmount + pageSizeNum ? pageNum + 1 : -1;
	const prev = pageNum > 1 ? pageNum - 1 : -1;

	res.json(
		new CustomPaginatedResponse(
			true,
			attendances,
			'Attendances fetched successfully',
			next,
			prev,
			totalPages,
			total
		)
	);
});

/**
 * @route GET /api/v1/attendance/:attendanceID - Get single attendance of an event
 */
export const getSingleAttendanceHandler = asyncHandler(async (req, res) => {
	const { attendanceID } = req.params;

	const attendance = await AttendanceModel.findById(attendanceID);

	res.json(
		new CustomResponse(true, attendance, 'Attendance fetched successfully')
	);
});

/**
 * @route POST /api/v1/attendance/record/time-in/event/:eventID - Record attendance (time in)
 */	export const recordTimeInAttendanceHandler = asyncHandler(async (req, res) => {
	const { eventID } = req.params;
	const { studentID } = req.body;

	// Check if event exists first — don't create placeholder students for
	// nonexistent events.
	const event = await EventModel.findById(eventID);
	appAssert(event, NOT_FOUND, 'Event not found');

	const student = await findOrCreateStudent(studentID);

	// Check if student has already checked in
	const existingAttendance = await AttendanceModel.findOne({
		event: eventID,
		studentID,
	});
	appAssert(
		!existingAttendance?.timeIn,
		BAD_REQUEST,
		'Student has already checked in',
		AppErrorCodes.AlreadyCheckedIn
	);

	const attendance = await AttendanceModel.create({
		event: eventID,
		studentID,
		recordedBy: (req as any).user?._id,
		student: student._id,
		timeIn: new Date(),
		timeOut: null,
	});

	res.json(
		new CustomResponse(true, attendance, 'Attendance recorded successfully')
	);
});

/**
 * @route POST /api/v1/attendance/record/time-out/event/:eventID - Record attendance (time out)
 */	export const recordTimeOutAttendanceHandler = asyncHandler(async (req, res) => {
	const { eventID } = req.params;
	const { studentID } = req.body;

	// Check if event exists first — don't create placeholder students for
	// nonexistent events.
	const event = await EventModel.findById(eventID);
	appAssert(event, NOT_FOUND, 'Event not found');

	const student = await findOrCreateStudent(studentID);

	const attendance = await AttendanceModel.findOne({
		event: eventID,
		studentID,
	});

	// If the student has not checked in, create a new record, but only time out
	if (!attendance) {
		const newAttendance = await AttendanceModel.create({
			event: eventID,
			studentID,
			recordedBy: (req as any).user?._id,
			student: student._id,
			timeIn: null,
			timeOut: new Date(),
		});

		res.json(
			new CustomResponse(
				true,
				newAttendance,
				'Attendance recorded successfully'
			)
		);
		return;
	}

	// If the student has checked in, update the record
	appAssert(
		!attendance.timeOut,
		BAD_REQUEST,
		'Student has already checked out',
		AppErrorCodes.AlreadyCheckedOut
	);
	attendance.timeOut = new Date();
	await attendance.save();

	res.json(
		new CustomResponse(true, attendance, 'Attendance recorded successfully')
	);
});

/**
 * @route GET /api/v1/attendance/event/:eventID/download/csv
 */
export const downloadEventAttendanceCSVHandler = asyncHandler(
	async (req, res) => {
		const { eventID } = req.params;

		const event = await EventModel.findById(eventID);
		appAssert(event, NOT_FOUND, 'Event not found');

		const attendances = await AttendanceModel.find({ event: eventID })
			.populate('student')
			.populate('event');

		const csv = [
			'No.,Student ID,Full Name,Course/Year,Event Name,Date,Time In,Time Out,Remarks',
			...attendances.map((attendance, i) => {
				// Placeholder students (auto-created from scans) have no masterlist
				// data yet — export blank name/course cells instead of empty-name noise.
				// A missing student ref (deleted doc) is treated the same way.
				const student = attendance.student;
				const isPlaceholder = !student || student.isPlaceholder;
				const fullname = isPlaceholder
					? ''
					: `${student.firstname} ${student.middlename ?? ''} ${student.lastname}`.trim();
				const courseYear = isPlaceholder
					? ''
					: `${student.course}/${student.year}`;
				const eventDate = format(new Date(event.startTime), 'MM/dd/yyyy');
				const timeIn = attendance.timeIn
					? format(new Date(attendance.timeIn), 'hh:mm aaa')
					: '--';
				const timeOut = attendance.timeOut
					? format(new Date(attendance.timeOut), 'hh:mm aaa')
					: '--';

				let remarks = 'Absent';

				if (attendance.timeIn && attendance.timeOut) {
					const start = new Date(event.startTime);
					const timeIn = new Date(attendance.timeIn);

					const minutesLate = differenceInMinutes(timeIn, start);

					if (minutesLate <= 30) {
						remarks = 'Present';
					} else {
						remarks = 'Late';
					}
				}

				return `${i},${attendance.studentID},${fullname},${courseYear},${event.title},${eventDate},${timeIn},${timeOut},${remarks}`;
			}),
		];

		res.set({
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename=${event.title}-attendances.csv`,
		});

		res.send(csv.join('\n'));
	}
);

/**
 * @route PATCH /api/v1/attendance/:attendanceID — update studentID on an
 * existing attendance record. The caller provides a new studentID; the
 * handler resolves/looks-up the corresponding Student doc and replaces
 * both `studentID` and the `student` ref on the attendance record.
 */
export const updateAttendanceHandler = asyncHandler(async (req, res) => {
	const { attendanceID } = req.params;
	const { studentID } = req.body;

	appAssert(
		typeof studentID === 'string' && studentID.length === STUDENT_ID_LENGTH,
		BAD_REQUEST,
		`Student ID must be exactly ${STUDENT_ID_LENGTH} digits`
	);

	const attendance = await AttendanceModel.findById(attendanceID);
	appAssert(attendance, NOT_FOUND, 'Attendance record not found');

	const student = await findOrCreateStudent(studentID);

	attendance.studentID = studentID;
	(attendance as any).student = student._id;
	await attendance.save();

	// Return the record fully populated so the client can update the table row
	const populated = await AttendanceModel.findById(attendance._id)
		.populate('student')
		.populate('event');

	res.json(
		new CustomResponse(true, populated, 'Attendance updated successfully')
	);
});
