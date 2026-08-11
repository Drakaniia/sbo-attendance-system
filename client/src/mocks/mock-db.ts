/**
 * In-memory database, types, seed data, and lookup helpers for the
 * browser IPC mock.  Imported by `mock-handlers.ts` and `index.ts`.
 */

// ── tiny deterministic PRNG so the sample data is stable per reload ─────

function mulberry32(seed: number): () => number {
	let t = seed;
	return function () {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), t | 1);
		r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

// ── in-memory dataset ────────────────────────────────────────────────────

export type MockStudent = {
	_id: string;
	studentID: string;
	firstname: string;
	lastname: string;
	middlename: string;
	gender: 'M' | 'F';
	course: string;
	year: number;
	email: string;
	isPlaceholder: boolean;
	createdAt: string;
	updatedAt: string;
};

export type MockEvent = {
	_id: string;
	title: string;
	description: string;
	type: string;
	venue: string;
	startTime: string;
	endTime: string;
	createdBy: string | null;
	archived: boolean;
	createdAt: string;
	updatedAt: string;
};

export type MockAttendance = {
	_id: string;
	eventId: string;
	studentId: string;
	studentIDNumber: string;
	timeIn: string | null;
	timeOut: string | null;
	createdAt: string;
	updatedAt: string;
};

export const MALE_FIRST = [
	'Juan', 'Jose', 'Miguel', 'Gabriel', 'Rafael', 'Paolo', 'Marco', 'Adrian',
	'Joshua', 'Nathaniel', 'Christian', 'Emmanuel', 'Daniel', 'Franco', 'Ivan',
	'Kyle', 'Luis', 'Marcus', 'Noah', 'Renz', 'Seth', 'Tristan', 'Vincent',
	'Xavier', 'Zion', 'Angelo', 'Bryce', 'Carlo', 'Derrick', 'Elijah',
];
export const FEMALE_FIRST = [
	'Maria', 'Ana', 'Bianca', 'Camille', 'Danica', 'Erika', 'Faith', 'Gianna',
	'Hannah', 'Isabella', 'Jasmine', 'Katrina', 'Lianne', 'Mikaela', 'Nathalie',
	'Odessa', 'Patricia', 'Queenie', 'Roxanne', 'Samantha', 'Tiffany', 'Vanessa',
	'Wendy', 'Yzabella', 'Zoe', 'Angelica', 'Bea', 'Cristina', 'Diana', 'Elena',
];
export const SURNAMES = [
	'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza',
	'Torres', 'Flores', 'Ramos', 'Aquino', 'Dela Cruz', 'Navarro', 'Salazar',
	'Villanueva', 'Domingo', 'Castillo', 'Fernandez', 'Gonzales', 'Pascual',
	'Rivera', 'Soriano', 'Valdez', 'Manalo', 'Buenaventura', 'Cabrera', 'Estrada',
	'Ferrer', 'Guerrero', 'Herrera', 'Lopez', 'Marquez', 'Nunez', 'Padilla',
	'Quintana', 'Rosario', 'Santiago', 'Tolentino', 'Uy', 'Velasco',
];
export const COURSES = ['BSIT', 'BSCS', 'BSCE', 'BSBA', 'BSN', 'BSEd', 'BSPSY'];

export const rand = mulberry32(20260811);
export const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

export function isoDaysAgo(days: number, hour = 8, minute = 0): string {
	const d = new Date();
	d.setDate(d.getDate() - days);
	d.setHours(hour, minute, 0, 0);
	return d.toISOString();
}

export function pad(n: number, width: number): string {
	return String(n).padStart(width, '0');
}

// ── seed data builders ───────────────────────────────────────────────────

function buildStudents(): MockStudent[] {
	const list: MockStudent[] = [];
	for (let i = 0; i < 64; i++) {
		const gender: 'M' | 'F' = rand() < 0.5 ? 'M' : 'F';
		const firstname = gender === 'M' ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
		const lastname = pick(SURNAMES);
		const middlename = rand() < 0.75 ? pick(SURNAMES) : '';
		const course = pick(COURSES);
		const year = 1 + Math.floor(rand() * 4);
		const studentID = String(2000000000 + i * 37);
		const createdAt = isoDaysAgo(30 + Math.floor(rand() * 330));
		list.push({
			_id: `stu-${pad(i + 1, 3)}`,
			studentID,
			firstname,
			lastname,
			middlename,
			gender,
			course,
			year,
			email: `${firstname.toLowerCase()}.${lastname.toLowerCase().replace(/\s+/g, '')}@univ.edu.ph`,
			isPlaceholder: false,
			createdAt,
			updatedAt: createdAt,
		});
	}
	return list;
}

function buildEvents(): MockEvent[] {
	const defs: Array<
		Pick<MockEvent, 'title' | 'description' | 'type' | 'venue'> & {
			daysAgo: number;
			startHour: number;
			startMin: number;
			durationHours: number;
			archived?: boolean;
		}
	> = [
		{ title: 'CO General Assembly', description: 'General assembly of the College of Technology student body to plan the semester.', type: 'General Assembly', venue: 'COT Auditorium', daysAgo: 3, startHour: 8, startMin: 0, durationHours: 4 },
		{ title: 'Blood Donation Drive', description: 'Bloodletting activity in partnership with the local Red Cross chapter.', type: 'Outreach', venue: 'COB Function Hall', daysAgo: 6, startHour: 8, startMin: 30, durationHours: 5 },
		{ title: 'Leadership Summit 2026', description: 'Leadership training and workshops for all student organization officers.', type: 'Seminar', venue: 'University Gymnasium', daysAgo: 9, startHour: 9, startMin: 0, durationHours: 6 },
		{ title: 'Intramurals Opening Ceremony', description: 'Parade and opening program for the annual intramural sports.', type: 'Sports', venue: 'Athletic Field', daysAgo: 12, startHour: 7, startMin: 0, durationHours: 3 },
		{ title: 'Book Donation for Literacy Week', description: 'Book drive supporting public school libraries in the community.', type: 'Fundraiser', venue: 'Student Center Lobby', daysAgo: 16, startHour: 8, startMin: 0, durationHours: 4 },
		{ title: 'Career Fair 2026', description: 'Job fair featuring partner companies and on-the-spot interviews.', type: 'Career Fair', venue: 'COB Function Hall', daysAgo: 20, startHour: 9, startMin: 0, durationHours: 8 },
		{ title: 'Freshmen Orientation', description: 'Welcome orientation for incoming first-year students.', type: 'Orientation', venue: 'University Gymnasium', daysAgo: 26, startHour: 8, startMin: 0, durationHours: 5, archived: true },
		{ title: 'Christmas Party 2025', description: 'Year-end celebration for members, staff, and faculty.', type: 'Social', venue: 'COB Function Hall', daysAgo: 40, startHour: 17, startMin: 0, durationHours: 4, archived: true },
	];

	return defs.map((d, i) => {
		const startTime = isoDaysAgo(d.daysAgo, d.startHour, d.startMin);
		const start = new Date(startTime);
		start.setHours(start.getHours() + d.durationHours);
		const endTime = start.toISOString();
		const createdAt = isoDaysAgo(d.daysAgo + 7);
		return {
			_id: `evt-${pad(i + 1, 2)}`,
			title: d.title,
			description: d.description,
			type: d.type,
			venue: d.venue,
			startTime,
			endTime,
			createdBy: null,
			archived: d.archived ?? false,
			createdAt,
			updatedAt: createdAt,
		};
	});
}

function buildAttendance(students: MockStudent[], events: MockEvent[]): MockAttendance[] {
	const list: MockAttendance[] = [];
	let seq = 0;
	for (const event of events) {
		if (event.archived) continue;
		const start = new Date(event.startTime);
		const count = 16 + Math.floor(rand() * 26);
		const indices = students.map((_, i) => i);
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			[indices[i], indices[j]] = [indices[j]!, indices[i]!];
		}
		for (let k = 0; k < Math.min(count, indices.length); k++) {
			const student = students[indices[k]!]!;
			const timeInDate = new Date(start);
			timeInDate.setHours(start.getHours() + 1 + Math.floor(rand() * 6), Math.floor(rand() * 60), 0, 0);
			const timeIn = timeInDate.toISOString();
			let timeOut: string | null = null;
			if (rand() < 0.7) {
				timeInDate.setHours(timeInDate.getHours() + 1 + Math.floor(rand() * 3));
				timeOut = timeInDate.toISOString();
			}
			seq += 1;
			list.push({
				_id: `att-${pad(seq, 4)}`,
				eventId: event._id,
				studentId: student._id,
				studentIDNumber: student.studentID,
				timeIn,
				timeOut,
				createdAt: timeIn,
				updatedAt: timeOut ?? timeIn,
			});
		}
	}
	return list;
}

// ── in-memory database ───────────────────────────────────────────────────

export const db = {
	students: [] as MockStudent[],
	events: [] as MockEvent[],
	attendance: [] as MockAttendance[],
};

/** Populate the in-memory database with deterministic sample data. */
export function initDb(): void {
	const students = buildStudents();
	const events = buildEvents();
	db.students = students;
	db.events = events;
	db.attendance = buildAttendance(students, events);
}

// ── lookup helpers ───────────────────────────────────────────────────────

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const latency = () => 150 + Math.random() * 250;

export function studentById(idNumber: string): MockStudent | undefined {
	return db.students.find((s) => s.studentID === idNumber);
}

export function eventById(id: string): MockEvent | undefined {
	return db.events.find((e) => e._id === id);
}

export function attendanceById(id: string): MockAttendance | undefined {
	return db.attendance.find((a) => a._id === id);
}

/** Populated attendance shape — mirrors `attendance::AttendancePopulated`. */
export function populated(a: MockAttendance) {
	const event = eventById(a.eventId);
	const student = db.students.find((s) => s._id === a.studentId);
	return {
		_id: a._id,
		event: event
			? { _id: event._id, title: event.title, type: event.type, startTime: event.startTime, endTime: event.endTime }
			: null,
		recordedBy: null,
		student: student
			? { _id: student._id, studentID: student.studentID, firstname: student.firstname, lastname: student.lastname, middlename: student.middlename, course: student.course, year: student.year, isPlaceholder: student.isPlaceholder }
			: null,
		studentID: a.studentIDNumber,
		timeIn: a.timeIn,
		timeOut: a.timeOut,
		createdAt: a.createdAt,
		updatedAt: a.updatedAt,
	};
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
	const total = items.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const offset = (page - 1) * pageSize;
	const slice = items.slice(offset, offset + pageSize);
	return { data: slice, total, totalPages, next: offset + pageSize < total ? page + 1 : -1, prev: page > 1 ? page - 1 : -1 };
}

/** Filter attendance by reports date range (startDate/endDate are 'YYYY-MM-DD'). */
export function inRange(att: MockAttendance, startDate?: string, endDate?: string): boolean {
	const day = att.createdAt.slice(0, 10);
	if (startDate && day < startDate) return false;
	if (endDate && day > endDate) return false;
	return true;
}

export function attendanceInRange(startDate?: string, endDate?: string, eventId?: string): MockAttendance[] {
	return db.attendance.filter((a) => (!eventId || a.eventId === eventId) && inRange(a, startDate, endDate));
}
