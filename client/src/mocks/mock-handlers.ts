/**
 * IPC command handlers for the browser mock.
 *
 * Mirrors the Rust commands in `src-tauri/src/commands/`.  Every case
 * handler reads/writes the in-memory `db` from `mock-db.ts`.
 *
 * Reports & settings commands are delegated to `mock-handlers-reports.ts`
 * to keep this file under 400 lines.
 */

import {
	db,
	eventById,
	studentById,
	attendanceById,
	populated,
	paginate,
	isoDaysAgo,
} from './mock-db';
import { handleReportsAndSettings } from './mock-handlers-reports';

// ── shared helper (only used by core handlers) ───────────────────────────

function listStudentsHandler(args: Record<string, unknown>) {
	const page = Math.max(1, Number(args.page ?? 1));
	const pageSize = Math.min(1000, Math.max(1, Number(args.pageSize ?? 100)));
	const search = typeof args.search === 'string' ? args.search.toLowerCase() : '';
	const course = typeof args.course === 'string' ? args.course : '';
	const year = args.year != null ? Number(args.year) : undefined;
	const gender = typeof args.gender === 'string' ? args.gender : '';
	const includePlaceholders = args.includePlaceholders === true;

	let rows = db.students.filter((s) => {
		if (!includePlaceholders && s.isPlaceholder) return false;
		if (course && s.course !== course) return false;
		if (year !== undefined && s.year !== year) return false;
		if (gender && s.gender !== gender) return false;
		if (search) {
			const haystack = `${s.studentID} ${s.firstname} ${s.lastname} ${s.middlename}`.toLowerCase();
			if (!haystack.includes(search)) return false;
		}
		return true;
	});

	rows = rows.sort((a, b) => {
		const cmp = a.firstname.localeCompare(b.firstname);
		return args.sortBy === 'dec' ? -cmp : cmp;
	});

	return paginate(rows, page, pageSize);
}

// ── main command dispatcher ──────────────────────────────────────────────

export function handleCommand(cmd: string, args: Record<string, unknown> = {}): unknown {
	// Delegate reports & settings commands to the extracted module.
	const result = handleReportsAndSettings(cmd, args);
	if (result !== undefined) return result;

	switch (cmd) {
		// ── students ────────────────────────────────────────────────
		case 'list_students':
			return listStudentsHandler((args.args ?? {}) as Record<string, unknown>);

		case 'list_student_courses':
			return [
				...new Set(db.students.filter((s) => !s.isPlaceholder && s.course).map((s) => s.course)),
			].sort();

		// ── events ─────────────────────────────────────────────────
		case 'list_events':
			return db.events
				.filter((e) => !e.archived)
				.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

		case 'get_event': {
			const event = eventById(String(args.eventId));
			if (!event) throw { message: 'Event not found' };
			return event;
		}

		case 'create_event': {
			const payload = (args.payload ?? {}) as Record<string, string>;
			for (const field of ['title', 'description', 'type', 'venue', 'startTime', 'endTime']) {
				if (!payload[field]?.trim()) throw { message: `${field} is required` };
			}
			const now = new Date().toISOString();
			const event = {
				_id: `evt-${db.events.length + 1}`,
				title: payload.title!,
				description: payload.description!,
				type: payload.type!,
				venue: payload.venue!,
				startTime: payload.startTime!,
				endTime: payload.endTime!,
				createdBy: null,
				archived: false,
				createdAt: now,
				updatedAt: now,
			};
			db.events.push(event);
			return event;
		}

		case 'update_event': {
			const event = eventById(String(args.eventId));
			if (!event) throw { message: 'Event not found' };
			const payload = (args.payload ?? {}) as Record<string, string>;
			for (const field of ['title', 'description', 'type', 'venue', 'startTime', 'endTime']) {
				if (payload[field] !== undefined) {
					(event as Record<string, unknown>)[field] = payload[field];
				}
			}
			event.updatedAt = new Date().toISOString();
			return event;
		}

		case 'delete_event': {
			const event = eventById(String(args.eventId));
			if (!event) throw { message: 'Event not found' };
			if (db.attendance.some((a) => a.eventId === event._id)) {
				throw { message: 'Event has attendances' };
			}
			db.events = db.events.filter((e) => e._id !== event._id);
			return event;
		}

		case 'archive_event':
		case 'unarchive_event': {
			const event = eventById(String(args.eventId));
			if (!event) throw { message: 'Event not found' };
			event.archived = cmd === 'archive_event';
			event.updatedAt = new Date().toISOString();
			return event;
		}

		case 'event_attendance_summary': {
			const event = eventById(String(args.eventId));
			if (!event) throw { message: 'Event not found' };
			const records = db.attendance.filter((a) => a.eventId === event._id);
			const totalCheckedIn = records.filter((a) => a.timeIn !== null).length;
			const totalCheckedOut = records.filter((a) => a.timeOut !== null).length;
			return {
				totalCheckedIn,
				totalCheckedOut,
				rate: totalCheckedIn > 0 ? (totalCheckedOut / totalCheckedIn) * 100 : 0,
			};
		}

		// ── attendance ──────────────────────────────────────────────
		case 'list_recent_attendances': {
			const limit = Math.min(100, Math.max(1, Number(args.limit ?? 10)));
			return db.attendance
				.slice()
				.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
				.slice(0, limit)
				.map(populated);
		}

		case 'list_event_attendances': {
			const page = Math.max(1, Number(args.page ?? 1));
			const pageSize = Math.min(100, Math.max(1, Number(args.pageSize ?? 10)));
			const records = db.attendance
				.filter((a) => a.eventId === args.eventId)
				.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
			const paged = paginate(records, page, pageSize);
			return { ...paged, data: paged.data.map(populated) };
		}

		case 'get_attendance': {
			const att = attendanceById(String(args.attendanceId));
			if (!att) throw { message: 'Attendance not found' };
			return populated(att);
		}

		case 'record_time_in': {
			const event = eventById(String(args.eventId));
			if (!event) throw { message: 'Event not found' };
			const studentIDNumber = String(args.studentId);
			const existing = db.attendance.find(
				(a) => a.eventId === event._id && a.studentIDNumber === studentIDNumber && a.timeIn !== null
			);
			if (existing)
				throw {
					message: 'Student is already checked in for this event',
					errorCode: 'AlreadyCheckedIn',
				};
			let student = studentById(studentIDNumber);
			if (!student) {
				student = {
					_id: `stu-ph-${db.students.length + 1}`,
					studentID: studentIDNumber,
					firstname: 'Student',
					lastname: studentIDNumber,
					middlename: '',
					gender: 'M',
					course: '',
					year: 1,
					email: '',
					isPlaceholder: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
				db.students.push(student);
			}
			const now = new Date().toISOString();
			const att = {
				_id: `att-${db.attendance.length + 1}`,
				eventId: event._id,
				studentId: student._id,
				studentIDNumber,
				timeIn: now,
				timeOut: null,
				createdAt: now,
				updatedAt: now,
			};
			db.attendance.push(att);
			return populated(att);
		}

		case 'record_time_out': {
			const event = eventById(String(args.eventId));
			if (!event) throw { message: 'Event not found' };
			const studentIDNumber = String(args.studentId);
			const existing = db.attendance.find(
				(a) => a.eventId === event._id && a.studentIDNumber === studentIDNumber && a.timeIn !== null
			);
			if (!existing) throw { message: 'Student is not checked in for this event' };
			if (existing.timeOut !== null)
				throw {
					message: 'Student is already checked out for this event',
					errorCode: 'AlreadyCheckedOut',
				};
			const now = new Date().toISOString();
			existing.timeOut = now;
			existing.updatedAt = now;
			return populated(existing);
		}

		case 'update_attendance': {
			const att = attendanceById(String(args.attendanceId));
			if (!att) throw { message: 'Attendance not found' };
			const studentIDNumber = String(args.studentId);
			const student = studentById(studentIDNumber);
			if (!student) throw { message: 'Student not found' };
			att.studentIDNumber = studentIDNumber;
			att.studentId = student._id;
			att.updatedAt = new Date().toISOString();
			return populated(att);
		}

		case 'export_event_excel':
			return null;

		// ── dashboard ───────────────────────────────────────────────
		case 'dashboard_stats': {
			const totalEvents = db.events.length;
			const activeEvents = db.events.filter((e) => !e.archived).length;
			const archivedEvents = db.events.filter((e) => e.archived).length;
			const totalStudents = db.students.filter((s) => !s.isPlaceholder).length;
			const totalAttendances = db.attendance.length;
			const totalCheckIns = db.attendance.filter((a) => a.timeIn !== null).length;
			const totalCheckOuts = db.attendance.filter((a) => a.timeOut !== null).length;
			return {
				totalEvents,
				activeEvents,
				archivedEvents,
				totalStudents,
				totalAttendances,
				totalCheckIns,
				totalCheckOuts,
				attendanceRate: totalCheckIns > 0 ? Math.round((totalCheckOuts / totalCheckIns) * 100) : 0,
			};
		}

		case 'dashboard_event_attendance': {
			return db.events
				.filter((e) => !e.archived)
				.map((e) => {
					const records = db.attendance.filter((a) => a.eventId === e._id);
					return {
						eventId: e._id,
						title: e.title,
						type: e.type,
						startTime: e.startTime,
						checkIns: records.filter((a) => a.timeIn !== null).length,
						checkOuts: records.filter((a) => a.timeOut !== null).length,
						total:
							records.filter((a) => a.timeIn !== null).length +
							records.filter((a) => a.timeOut !== null).length,
					};
				})
				.sort((a, b) => b.startTime.localeCompare(a.startTime))
				.slice(0, 10);
		}

		case 'dashboard_course_distribution': {
			const counts = new Map<string, number>();
			for (const s of db.students) {
				if (s.isPlaceholder || !s.course) continue;
				counts.set(s.course, (counts.get(s.course) ?? 0) + 1);
			}
			return [...counts.entries()]
				.map(([course, students]) => ({ course, students }))
				.sort((a, b) => b.students - a.students)
				.slice(0, 8);
		}

		case 'dashboard_recent_activity': {
			const limit = Math.min(50, Math.max(1, Number(args.limit ?? 8)));
			return db.attendance
				.slice()
				.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
				.slice(0, limit)
				.map((a) => {
					const student = db.students.find((s) => s._id === a.studentId);
					const event = eventById(a.eventId);
					return {
						_id: a._id,
						studentID: a.studentIDNumber,
						timeIn: a.timeIn,
						timeOut: a.timeOut,
						updatedAt: a.updatedAt,
						student: student
							? {
									_id: student._id,
									studentID: student.studentID,
									firstname: student.firstname,
									lastname: student.lastname,
									course: student.course,
									year: student.year,
								}
							: null,
						event: event ? { _id: event._id, title: event.title, type: event.type } : null,
					};
				});
		}

		case 'dashboard_attendance_trend': {
			const days = Math.min(365, Math.max(1, Number(args.days ?? 14)));
			const out: Array<{ date: string; checkIns: number; checkOuts: number; total: number }> = [];
			for (let i = days - 1; i >= 0; i--) {
				const key = isoDaysAgo(i).slice(0, 10);
				const records = db.attendance.filter((a) => a.createdAt.slice(0, 10) === key);
				const checkIns = records.filter((a) => a.timeIn !== null).length;
				const checkOuts = records.filter((a) => a.timeOut !== null).length;
				out.push({ date: key, checkIns, checkOuts, total: checkIns + checkOuts });
			}
			return out;
		}

		default:
			throw { message: `Mock IPC: unhandled command "${cmd}"` };
	}
}
