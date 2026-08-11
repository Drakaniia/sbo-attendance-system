import type { StudentFilterValues } from '../store/students-filter';
import type { PaginatedResult } from '../types/api-response';
import type { Student } from '../types/student';
import { ipc } from '../lib/ipc';

export const fetchStudents = async (
	filters: StudentFilterValues,
	page: number = 1,
	pageSize: number = 50,
	signal?: AbortSignal
): Promise<PaginatedResult<Student[]>> => {
	const defaultFilterValue = 'All';

	const course = filters.course === defaultFilterValue ? undefined : filters.course;
	// The filter store keeps year as a UI string ('1'–'4'); the IPC command
	// expects a real number (i64), so convert before sending — a string would
	// fail serde deserialization and error the whole student list.
	const year =
		filters.year && filters.year !== defaultFilterValue ? Number(filters.year) : undefined;
	const gender = filters.gender === defaultFilterValue ? undefined : filters.gender;

	const args: Record<string, unknown> = { page, pageSize };
	if (filters.search) args.search = filters.search;
	if (course) args.course = course;
	if (year !== undefined) args.year = year;
	if (gender) args.gender = gender;
	if (filters.sortBy) args.sortBy = filters.sortBy;

	return ipc<PaginatedResult<Student[]>>('list_students', { args }, { signal });
};

export const fetchAvailableCourses = async (signal?: AbortSignal): Promise<string[]> => {
	return ipc<string[]>('list_student_courses', undefined, { signal });
};
