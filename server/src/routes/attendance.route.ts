import express from 'express';
import {
	downloadEventAttendanceCSVHandler,
	getAttendanceHandler,
	getEventAttendanceHandler,
	getSingleAttendanceHandler,
	recordTimeInAttendanceHandler,
	recordTimeOutAttendanceHandler,
	updateAttendanceHandler,
} from '../controllers/attendance.controller';

const router = express.Router();

router.get('/', getAttendanceHandler);
router.get('/event/:eventID', getEventAttendanceHandler);
router.get('/:attendanceID', getSingleAttendanceHandler);
router.post('/record/time-in/event/:eventID', recordTimeInAttendanceHandler);
router.post('/record/time-out/event/:eventID', recordTimeOutAttendanceHandler);
router.get('/event/:eventID/download/csv', downloadEventAttendanceCSVHandler);
router.patch('/:attendanceID', updateAttendanceHandler);

export default router;
