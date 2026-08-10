import { cn, getEventStatusInfo, EVENT_STATUS_META, type EventStatus } from '../lib/utils';
import type { Event } from '../types/event';

type EventStatusPillProps = {
	event: Pick<Event, 'startTime' | 'endTime'>;
	className?: string;
	size?: 'sm' | 'md';
};

const SIZES = {
	sm: 'px-2 py-0.5 text-[10px] gap-1.5',
	md: 'px-2.5 py-1 text-[11px] gap-1.5',
};

export default function EventStatusPill({ event, className, size = 'md' }: EventStatusPillProps) {
	const status: EventStatus = getEventStatusInfo(
		new Date(event.startTime),
		new Date(event.endTime)
	);
	const meta = EVENT_STATUS_META[status];

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] font-medium',
				SIZES[size],
				meta.text,
				className
			)}
		>
			<span
				className={cn(
					'w-1.5 h-1.5 rounded-full',
					meta.dot,
					status === 'ongoing' && 'motion-safe:animate-pulse'
				)}
			/>
			{meta.label}
		</span>
	);
}
