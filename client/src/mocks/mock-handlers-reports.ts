/**
 * Reports & settings command handlers for the browser mock.
 *
 * Extracted from `mock-handlers.ts` to keep each file under 400 lines.
 */

import {
	db,
	rand,
	MALE_FIRST,
	FEMALE_FIRST,
	SURNAMES,
	COURSES,
	pick,
	attendanceInRange,
	type MockStudent,
} from './mock-db';

/**
 * Dispatch reports and settings/app-level commands.
 * Returns `undefined` for commands it doesn't handle so the caller can
 * fall through to the default error.
 */
export function handleReportsAndSettings(cmd: string, args: Record<string, unknown>): unknown | undefined {
	switch (cmd) {
		// ── reports ────────────────────────────────────────────────
		case 'reports_stats': {
			const q = (args.query ?? {}) as Record<string, string>;
			const records = attendanceInRange(q.startDate, q.endDate, q.eventId);
			const totalCheckIns = records.filter((a) => a.timeIn !== null).length;
			const totalCheckOuts = records.filter((a) => a.timeOut !== null).length;
			const uniqueStudents = new Set(records.filter((a) => { const s = db.students.find((st) => st._id === a.studentId); return s && !s.isPlaceholder; }).map((a) => a.studentId)).size;
			const activeEvents = new Set(records.map((a) => a.eventId)).size;
			return { totalCheckIns, totalCheckOuts, attendanceRate: totalCheckIns > 0 ? Math.round((totalCheckOuts / totalCheckIns) * 100) : 0, uniqueStudents, activeEvents, totalRecords: records.length };
		}

		case 'reports_attendance_trend': {
			const q = (args.query ?? {}) as Record<string, string>;
			const records = attendanceInRange(q.startDate, q.endDate, q.eventId);
			const byDay = new Map<string, { checkIns: number; checkOuts: number; total: number }>();
			for (const a of records) {
				const day = a.createdAt.slice(0, 10);
				const entry = byDay.get(day) ?? { checkIns: 0, checkOuts: 0, total: 0 };
				if (a.timeIn !== null) entry.checkIns += 1;
				if (a.timeOut !== null) entry.checkOuts += 1;
				entry.total += 1;
				byDay.set(day, entry);
			}
			return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
		}

		case 'reports_event_breakdown': {
			const q = (args.query ?? {}) as Record<string, string>;
			return db.events
				.filter((e) => !e.archived)
				.map((e) => {
					const records = attendanceInRange(q.startDate, q.endDate).filter((a) => a.eventId === e._id);
					const checkIns = records.filter((a) => a.timeIn !== null).length;
					const checkOuts = records.filter((a) => a.timeOut !== null).length;
					return { eventId: e._id, title: e.title, type: e.type, startTime: e.startTime, checkIns, checkOuts, total: checkIns + checkOuts };
				})
				.sort((a, b) => b.startTime.localeCompare(a.startTime))
				.slice(0, 20);
		}

		case 'reports_course_distribution': {
			const q = (args.query ?? {}) as Record<string, string>;
			const records = attendanceInRange(q.startDate, q.endDate, q.eventId);
			const counts = new Map<string, number>();
			for (const a of records) {
				const s = db.students.find((st) => st._id === a.studentId);
				if (!s || s.isPlaceholder || !s.course) continue;
				counts.set(s.course, (counts.get(s.course) ?? 0) + 1);
			}
			return [...counts.entries()].map(([course, students]) => ({ course, students })).sort((a, b) => b.students - a.students).slice(0, 10);
		}

		case 'reports_year_distribution': {
			const q = (args.query ?? {}) as Record<string, string>;
			const records = attendanceInRange(q.startDate, q.endDate, q.eventId);
			const counts = new Map<number, number>();
			for (const a of records) {
				const s = db.students.find((st) => st._id === a.studentId);
				if (!s || s.isPlaceholder) continue;
				counts.set(s.year, (counts.get(s.year) ?? 0) + 1);
			}
			return [...counts.entries()].sort(([a], [b]) => a - b).map(([year, students]) => ({ year, students }));
		}

		case 'reports_leaderboard': {
			const q = (args.query ?? {}) as Record<string, string>;
			const limit = Math.min(200, Math.max(1, Number(q.limit ?? 50)));
			const records = attendanceInRange(q.startDate, q.endDate, q.eventId);
			const byStudent = new Map<string, { name: string; course: string; year: number; total: number; checkIns: number; checkOuts: number }>();
			for (const a of records) {
				const s = db.students.find((st) => st._id === a.studentId);
				if (!s || s.isPlaceholder) continue;
				const entry = byStudent.get(a.studentIDNumber) ?? { name: `${s.firstname} ${s.lastname}`, course: s.course, year: s.year, total: 0, checkIns: 0, checkOuts: 0 };
				entry.total += 1;
				if (a.timeIn !== null) entry.checkIns += 1;
				if (a.timeOut !== null) entry.checkOuts += 1;
				byStudent.set(a.studentIDNumber, entry);
			}
			const rows = [...byStudent.entries()].map(([studentId, v]) => ({ studentId, name: v.name, course: v.course, year: v.year, totalAttendances: v.total, checkInRate: v.checkIns > 0 ? Math.round((v.checkOuts / v.checkIns) * 100) : 0 }));
			const byRate = q.sortBy === 'rate';
			rows.sort((a, b) => byRate ? b.checkInRate - a.checkInRate || b.totalAttendances - a.totalAttendances : b.totalAttendances - a.totalAttendances || b.checkInRate - a.checkInRate);
			return rows.slice(0, limit);
		}

		case 'reports_heatmap': {
			const q = (args.query ?? {}) as Record<string, string>;
			const mode = q.mode ?? 'hourly';
			const records = attendanceInRange(q.startDate, q.endDate, q.eventId).filter((a) => a.timeIn !== null);
			if (mode === 'daily') {
				const byCell = new Map<string, { dayOfWeek: number; hour: number; count: number }>();
				for (const a of records) {
					const d = new Date(a.timeIn!);
					const dayOfWeek = (d.getDay() + 6) % 7;
					const hour = d.getHours();
					const key = `${dayOfWeek}:${hour}`;
					const entry = byCell.get(key) ?? { dayOfWeek, hour, count: 0 };
					entry.count += 1;
					byCell.set(key, entry);
				}
				return [...byCell.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour);
			}
			const byHour = new Map<number, number>();
			for (const a of records) {
				const hour = new Date(a.timeIn!).getHours();
				byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
			}
			return [...byHour.entries()].sort(([a], [b]) => a - b).map(([hour, count]) => ({ hour, count }));
		}

		case 'export_reports_excel':
			return null;

		// ── settings / app-level ────────────────────────────────────
		case 'reset_all_data': {
			const summary = { students: db.students.length, events: db.events.length, attendance: db.attendance.length };
			db.students = [];
			db.events = [];
			db.attendance = [];
			return summary;
		}

		case 'get_app_settings':
			return { kiosk: false, autoStart: false };

		case 'set_kiosk':
		case 'set_auto_start':
			return null;

		case 'get_db_path':
			return 'C:\\Users\\seats\\AppData\\Roaming\\com.seats.app\\seats.db';

		case 'backup_db':
		case 'restore_db':
			return null;

		case 'import_students_file': {
			const imported: MockStudent[] = [];
			for (let i = 0; i < 5; i++) {
				const gender: 'M' | 'F' = rand() < 0.5 ? 'M' : 'F';
				const firstname = gender === 'M' ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
				const lastname = pick(SURNAMES);
				const now = new Date().toISOString();
				imported.push({
					_id: `stu-import-${db.students.length + imported.length + 1}`,
					studentID: String(2000000000 + Math.floor(rand() * 900000000)),
					firstname, lastname, middlename: '', gender, course: pick(COURSES),
					year: 1 + Math.floor(rand() * 4), email: '', isPlaceholder: false,
					createdAt: now, updatedAt: now,
				});
			}
			db.students.push(...imported);
			return imported.length;
		}

		// ── tauri plugin dialogs (Settings page) ────────────────────
		case 'plugin:dialog|open':
		case 'plugin:dialog|save':
			return 'C:\\Users\\seats\\Documents\\seats-backup.db';

		default:
			return undefined; // not handled — caller should fall through to default error
	}
}
