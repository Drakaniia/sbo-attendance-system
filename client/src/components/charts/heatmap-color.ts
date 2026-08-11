// ── Constants ───────────────────────────────────────────────────────────

export const HOUR_LABELS = [
	'12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a',
	'12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p',
];

export const HOUR_FULL_LABELS = [
	'12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM',
	'8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM',
	'4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM',
];

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LABELS_FULL = [
	'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

export const CELL_SIZE = 12;
export const CELL_GAP = 3;

// ── Color scale ─────────────────────────────────────────────────────────

export function heatmapColor(count: number, maxCount: number): string {
	if (count === 0) return 'rgba(255, 255, 255, 0.015)';
	const intensity = maxCount > 0 ? count / maxCount : 0;
	const opacity = 0.08 + intensity * 0.72;
	return `rgba(99, 102, 241, ${opacity.toFixed(3)})`;
}

// ── Get hover label ─────────────────────────────────────────────────────

export function getTooltipLabel(
	view: 'hourly' | 'daily',
	hour: number,
	count: number,
	dayOfWeek?: number
): string {
	if (view === 'hourly') {
		return `${HOUR_FULL_LABELS[hour]} — ${count} check-in${count !== 1 ? 's' : ''}`;
	}
	return `${DAY_LABELS_FULL[dayOfWeek ?? 0]} ${HOUR_FULL_LABELS[hour]} — ${count} check-in${count !== 1 ? 's' : ''}`;
}
