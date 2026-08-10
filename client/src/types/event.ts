import type z from 'zod';
import type { createEventSchema } from '../lib/event-schema';

export type Event = z.infer<typeof createEventSchema> & {
	_id: string;
	startTime: string;
	endTime: string;
};

// ── Event-day scanning (moved from pages/SingleEvent/types.ts) ──

export type TimeType = 'Time In' | 'Time Out';

export type ScanFeedback = {
	type: 'success' | 'duplicate' | 'error';
	message: string;
	studentID: string;
};
