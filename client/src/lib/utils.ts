import { clsx, type ClassValue } from 'clsx';
import { isFuture, isPast, isToday, isWithinInterval } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import type { Event } from '../types/event';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type EventStatus = 'ongoing' | 'today' | 'upcoming' | 'ended';

export const getEventStatusInfo = (start: Date, end: Date): EventStatus => {
	const now = new Date();

	if (isWithinInterval(now, { start, end })) return 'ongoing';
	if (isToday(start) && isFuture(start)) return 'today';
	if (isPast(end)) return 'ended';
	return 'upcoming';
};

export const EVENT_STATUS_META: Record<
	EventStatus,
	{ label: string; dot: string; text: string; tile: string; accent: string }
> = {
	ongoing: {
		label: 'Ongoing',
		dot: 'bg-[#43d7b0]',
		text: 'text-[#7ee8c9]',
		tile: 'text-[#7ee8c9] border-[#43d7b0]/30 bg-[#43d7b0]/[0.07]',
		accent: '#43d7b0',
	},
	today: {
		label: 'Today',
		dot: 'bg-[#6e9bff]',
		text: 'text-[#9bbcff]',
		tile: 'text-[#9bbcff] border-[#6e9bff]/30 bg-[#6e9bff]/[0.07]',
		accent: '#6e9bff',
	},
	upcoming: {
		label: 'Upcoming',
		dot: 'bg-white/50',
		text: 'text-white/70',
		tile: 'text-white/70 border-white/20 bg-white/[0.04]',
		accent: '#e4e4e7',
	},
	ended: {
		label: 'Ended',
		dot: 'bg-white/25',
		text: 'text-white/40',
		tile: 'text-white/40 border-white/10 bg-white/[0.02]',
		accent: '#71717a',
	},
};

export type EventStats = {
	ongoing: number;
	today: number;
	ended: number;
	upcoming: number;
};

export const countEventsStats = (events: Event[]): EventStats => {
	const now = new Date();
	const stats: EventStats = {
		ongoing: 0,
		today: 0,
		ended: 0,
		upcoming: 0,
	};

	events.map((event) => {
		const start = new Date(event.startTime);
		const end = new Date(event.endTime);

		if (isWithinInterval(now, { start, end })) {
			stats.ongoing++;
		} else if (isToday(start) && isFuture(start)) {
			stats.today++;
		} else if (isPast(end)) {
			stats.ended++;
		} else {
			stats.upcoming++;
		}
	});

	return stats;
};
