import asyncHandler from 'express-async-handler';
import CustomResponse from '../models/utils/response';
import EventModel from '../models/mongodb/event.model';
import StudentModel from '../models/mongodb/student.model';
import AttendanceModel from '../models/mongodb/attendance.model';

/**
 * @route GET /api/v1/dashboard/stats
 * Returns aggregated statistics for the dashboard
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
	const [
		totalEvents,
		activeEvents,
		archivedEvents,
		totalStudents,
		totalAttendances,
		totalCheckIns,
		totalCheckOuts,
	] = await Promise.all([
		EventModel.countDocuments(),
		EventModel.countDocuments({ archived: false }),
		EventModel.countDocuments({ archived: true }),
		// Placeholder students (auto-created from scans before the masterlist is
		// uploaded) are excluded from student-based stats.
		StudentModel.countDocuments({ isPlaceholder: { $ne: true } }),
		AttendanceModel.countDocuments(),
		AttendanceModel.countDocuments({ timeIn: { $ne: null } }),
		AttendanceModel.countDocuments({ timeOut: { $ne: null } }),
	]);

	// Calculate attendance rate
	const attendanceRate =
		totalCheckIns > 0
			? Math.round((totalCheckOuts / totalCheckIns) * 100)
			: 0;

	res.json(
		new CustomResponse(
			true,
			{
				totalEvents,
				activeEvents,
				archivedEvents,
				totalStudents,
				totalAttendances,
				totalCheckIns,
				totalCheckOuts,
				attendanceRate,
			},
			'Dashboard stats fetched successfully'
		)
	);
});

/**
 * @route GET /api/v1/dashboard/event-attendance
 * Returns attendance count per event (for bar/column charts)
 */
export const getEventAttendanceData = asyncHandler(async (req, res) => {
	const events = await EventModel.find({ archived: false })
		.sort({ startTime: -1 })
		.limit(10)
		.lean();

	const eventIds = events.map((event) => event._id);

	if (eventIds.length === 0) {
		res.json(
			new CustomResponse(
				true,
				[],
				'Event attendance data fetched successfully'
			)
		);
		return;
	}

	// Single aggregation instead of N+1 count queries
	const attendanceCounts = await AttendanceModel.aggregate([
		{ $match: { event: { $in: eventIds } } },
		{
			$group: {
				_id: '$event',
				checkIns: {
					$sum: { $cond: [{ $ne: ['$timeIn', null] }, 1, 0] },
				},
				checkOuts: {
					$sum: { $cond: [{ $ne: ['$timeOut', null] }, 1, 0] },
				},
			},
		},
	]);

	const countMap = new Map(
		attendanceCounts.map((entry) => [entry._id.toString(), entry])
	);

	const eventAttendanceData = events.map((event) => {
		const counts = countMap.get(event._id.toString());
		const checkIns = counts?.checkIns ?? 0;
		const checkOuts = counts?.checkOuts ?? 0;

		return {
			eventId: event._id,
			title: event.title,
			type: event.type,
			startTime: event.startTime,
			checkIns,
			checkOuts,
			total: checkIns + checkOuts,
		};
	});

	res.json(
		new CustomResponse(
			true,
			eventAttendanceData,
			'Event attendance data fetched successfully'
		)
	);
});

/**
 * @route GET /api/v1/dashboard/course-distribution
 * Returns student count per course (for pie/donut charts)
 */
export const getCourseDistribution = asyncHandler(async (req, res) => {
	const courseDistribution = await StudentModel.aggregate([
		// Exclude placeholder students (empty-course scans) from distribution
		{ $match: { isPlaceholder: { $ne: true } } },
		{
			$group: {
				_id: '$course',
				count: { $sum: 1 },
			},
		},
		{
			$match: {
				_id: { $ne: '' },
			},
		},
		{ $sort: { count: -1 } },
		{ $limit: 8 },
	]);

	const data = courseDistribution.map((item) => ({
		course: item._id || 'Unknown',
		students: item.count,
	}));

	res.json(
		new CustomResponse(
			true,
			data,
			'Course distribution fetched successfully'
		)
	);
});

/**
 * @route GET /api/v1/dashboard/recent-activity
 * Returns the most recent attendance records
 */
export const getRecentActivity = asyncHandler(async (req, res) => {
	const limit = parseInt((req.query.limit as string) || '8');

	const recentAttendances = await AttendanceModel.find()
		.sort({ updatedAt: -1 })
		.limit(limit)
		.populate('student', 'studentID firstname lastname course year')
		.populate('event', 'title type')
		.lean();

	res.json(
		new CustomResponse(
			true,
			recentAttendances,
			'Recent activity fetched successfully'
		)
	);
});

/**
 * @route GET /api/v1/dashboard/attendance-trend
 * Returns attendance counts grouped by day for the last 7/14 days
 */
export const getAttendanceTrend = asyncHandler(async (req, res) => {
	const days = parseInt((req.query.days as string) || '14');

	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	startDate.setHours(0, 0, 0, 0);

	const attendances = await AttendanceModel.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate },
			},
		},
		{
			$group: {
				_id: {
					$dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
				},
				checkIns: {
					$sum: { $cond: [{ $ne: ['$timeIn', null] }, 1, 0] },
				},
				checkOuts: {
					$sum: { $cond: [{ $ne: ['$timeOut', null] }, 1, 0] },
				},
				total: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]);

	res.json(
		new CustomResponse(
			true,
			attendances.map((a) => ({
				date: a._id,
				...a,
				_id: undefined,
			})),
			'Attendance trend fetched successfully'
		)
	);
});
