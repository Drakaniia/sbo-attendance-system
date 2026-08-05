import asyncHandler from 'express-async-handler';
import appAssert from '../errors/app-assert';
import { BAD_REQUEST } from '../constants/http';
import CustomResponse, {
	CustomPaginatedResponse,
} from '../models/utils/response';
import { serverlessCSVLoader } from '../utils/csv';
import { serverlessXLSXLoader } from '../utils/xlsx';
import { FilterQuery, PipelineStage } from 'mongoose';
import StudentModel, { IStudent } from '../models/mongodb/student.model';

/**
 * @route POST /api/v1/students/file/import
 */
export const importStudentHandler = asyncHandler(async (req, res) => {
	const file = req.file;
	appAssert(file, BAD_REQUEST, 'Server did not recieve any file');

	const isXLSX =
		file.mimetype ===
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

	const isCSV = file.mimetype === 'text/csv';

	appAssert(
		isCSV || isXLSX,
		BAD_REQUEST,
		'File must be in CSV (.csv) or Excel (.xlsx) format'
	);

	let valid: boolean;

	if (isXLSX) {
		valid = await serverlessXLSXLoader(req, file.buffer);
		appAssert(
			valid,
			BAD_REQUEST,
			'File was not read successfully. Make sure the Excel file follows the university masterlist format (header on row 8, data starting row 9).'
		);
		await serverlessXLSXLoader(req, file.buffer, true);
	} else {
		valid = await serverlessCSVLoader(req, file.buffer);
		appAssert(
			valid,
			BAD_REQUEST,
			'File was not read succesfully, make sure to check if the headers are proper and the file format is correct'
		);
		await serverlessCSVLoader(req, file.buffer, true);
	}

	res.json(new CustomResponse(true, null, 'File imported successfully'));
});

/**
 * @route GET /api/v1/students - paginated response of all students
 */
export const getStudentsHandler = asyncHandler(async (req, res) => {
	const { page, pageSize, search, course, year, gender, sortBy, includePlaceholders } =
		req.query;

	const defaultPage = 1;
	const defaultPageSize = 100;

	const pageNum = page ? parseInt(page as string) : defaultPage;
	const pageSizeNum = pageSize ? parseInt(pageSize as string) : defaultPageSize;
	const skipAmount = (pageNum - 1 || 0) * pageSizeNum;

	const filters: FilterQuery<IStudent>[] = [];

	// Placeholder students (auto-created from scans before the masterlist is
	// uploaded) are hidden from the list by default.
	if (includePlaceholders !== 'true') {
		filters.push({ isPlaceholder: { $ne: true } });
	}

	if (course) filters.push({ course: course });
	if (year) filters.push({ year: parseInt(year as string) });
	if (gender) filters.push({ gender: gender });
	if (search) {
		const searchRegex = new RegExp(search as string, 'i');
		filters.push({
			$or: [
				{ studentID: { $regex: searchRegex } },
				{ firstname: { $regex: searchRegex } },
				{ lastname: { $regex: searchRegex } },
				{ middlename: { $regex: searchRegex } },
			],
		});
	}

	const aggregatePipeline: PipelineStage[] = [
		{
			$sort: {
				firstname: sortBy === 'dec' ? -1 : 1,
			},
		},
		{
			$skip: skipAmount,
		},
		{
			$limit: pageSizeNum,
		},
	];

	if (filters.length > 0) {
		aggregatePipeline.unshift({
			$match: {
				$and: filters,
			},
		});
	}

	const students = await StudentModel.aggregate(aggregatePipeline);

	const countQuery = filters.length > 0 ? { $and: filters } : {};
	const total = await StudentModel.countDocuments(countQuery);
	const totalPages = Math.ceil(total / pageSizeNum) || 1;

	const next = total > skipAmount + pageSizeNum ? pageNum + 1 : -1;
	const prev = pageNum > 1 ? pageNum - 1 : -1;

	res.json(
		new CustomPaginatedResponse(
			true,
			students,
			'All students',
			next,
			prev,
			totalPages,
			total
		)
	);
});

/**
 * @route GET /api/v1/students/courses - list of all available courses
 */
export const getAvailableCourses = asyncHandler(async (req, res) => {
	const courses = await StudentModel.distinct('course', {
		isPlaceholder: { $ne: true },
		course: { $ne: '' },
	});

	res.json(new CustomResponse(true, courses, 'Students courses'));
});
