import XLSX from 'xlsx';
import { Request } from 'express';
import StudentModel from '../models/mongodb/student.model';

/**
 * Expected Excel column mapping (row 8 of the university masterlist):
 *
 *   A: No           → skip
 *   B: Code         → studentID (trimmed)
 *   C: Last Name    → lastname
 *   D: First Name   → firstname
 *   E: Middle Name  → middlename
 *   F: Sex          → gender
 *   G: Course       → course
 *   H: Year         → year
 *   I: Units        → skip
 *   J: Section      → skip
 *
 * Rows 1-7 contain metadata (university name, semester, dept) and are skipped.
 * Row 8 is the header row. Data rows start at row 9.
 */

interface XLSXRow {
	No?: string | number;
	Code?: string;
	'Last Name'?: string;
	'First Name'?: string;
	'Middle Name'?: string;
	Sex?: string;
	Course?: string;
	Year?: number;
}

const HEADER_ROW = 8; // 1-based — row 8 is the real header

export const serverlessXLSXLoader = async (
	_req: Request,
	buffer: Buffer,
	save?: boolean
): Promise<boolean> => {
	try {
		const workbook = XLSX.read(buffer, { type: 'buffer' });
		const sheetName = workbook.SheetNames[0];
		if (!sheetName) {
			throw new Error('Excel file contains no sheets');
		}

		const sheet = workbook.Sheets[sheetName];
		if (!sheet) {
			throw new Error(`Sheet "${sheetName}" not found in workbook`);
		}

		// Convert to JSON with header row at row 8 (XLSX uses 0-based, so
		// range=7 means "start reading from the 8th row as headers").
		const rows: XLSXRow[] = XLSX.utils.sheet_to_json<XLSXRow>(sheet, {
			range: HEADER_ROW - 1, // zero-based row offset
			defval: '',
		});

		for (const row of rows) {
			const studentID =
				typeof row.Code === 'string' ? row.Code.trim() : String(row.Code ?? '').trim();

			if (!studentID) {
				continue; // skip rows without a student ID
			}

			const firstname = (row['First Name'] ?? '').toString().trim();
			const lastname = (row['Last Name'] ?? '').toString().trim();
			const middlename = (row['Middle Name'] ?? '').toString().trim();
			const gender = (row.Sex ?? 'M').toString().trim().toUpperCase();
			const course = (row.Course ?? '').toString().trim();
			const year = Number(row.Year) || 1;

			const validGender = gender === 'F' ? 'F' : 'M';

			if (save) {
				const existingStudent = await StudentModel.findOne({ studentID });

				if (existingStudent) {
					existingStudent.set({
						firstname,
						lastname,
						middlename,
						course,
						year,
						gender: validGender,
						isPlaceholder: false,
					});
					await existingStudent.save();
				} else {
					await StudentModel.create({
						studentID,
						firstname,
						lastname,
						middlename,
						gender: validGender,
						course,
						year,
						email: '',
						isPlaceholder: false,
					});
				}
			}
		}
	} catch (error) {
		console.error('Failed to process xlsx students:', error);
		return false;
	}

	return true;
};
