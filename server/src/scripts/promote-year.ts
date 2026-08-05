/**
 * Year promotion script
 *
 * Promotes all non-placeholder students by +1 year level.
 * Year 4 students are left unchanged (kept in the system).
 *
 * Usage: npx ts-node src/scripts/promote-year.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import StudentModel from '../models/mongodb/student.model';
import { MONGO_URI } from '../constants/env';

async function promoteYear() {
	console.log(`Connecting to MongoDB...`);
	await mongoose.connect(MONGO_URI);
	console.log('Connected.\n');

	// Only promote students who are NOT in their final year (4) and are NOT placeholders
	const filter = {
		isPlaceholder: { $ne: true },
		year: { $lt: 4 },
	};

	const countBefore = await StudentModel.countDocuments(filter);
	console.log(`Students eligible for promotion (year 1-3, non-placeholder): ${countBefore}`);

	if (countBefore === 0) {
		console.log('No students to promote. Exiting.');
		await mongoose.disconnect();
		return;
	}

	// Bulk update: increment year by 1 for all matching students
	const result = await StudentModel.updateMany(filter, { $inc: { year: 1 } });

	console.log(`Promoted ${result.modifiedCount} students.\n`);

	// Summary breakdown
	const summary = await StudentModel.aggregate([
		{ $match: { isPlaceholder: { $ne: true } } },
		{ $group: { _id: '$year', count: { $sum: 1 } } },
		{ $sort: { _id: 1 } },
	]);

	console.log('New year-level breakdown (non-placeholders):');
	for (const row of summary) {
		console.log(`  Year ${row._id}: ${row.count} students`);
	}

	await mongoose.disconnect();
	console.log('\nDone.');
}

promoteYear().catch((err) => {
	console.error('Script failed:', err);
	mongoose.disconnect().finally(() => {
		throw err;
	});
});
