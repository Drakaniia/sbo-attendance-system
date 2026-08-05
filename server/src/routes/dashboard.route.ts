import express from 'express';
import {
	getAttendanceTrend,
	getCourseDistribution,
	getDashboardStats,
	getEventAttendanceData,
	getRecentActivity,
} from '../controllers/dashboard.controller';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/event-attendance', getEventAttendanceData);
router.get('/course-distribution', getCourseDistribution);
router.get('/recent-activity', getRecentActivity);
router.get('/attendance-trend', getAttendanceTrend);

export default router;
