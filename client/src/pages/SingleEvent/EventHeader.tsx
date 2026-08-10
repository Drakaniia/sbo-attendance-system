import { useNavigate } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import { format, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import type { Event } from '../../types/event';
import Header from '../../components/ui/Header';
import LiveClock from '../../components/LiveClock';
import EventStatusPill from '../../components/EventStatusPill';

type EventHeaderProps = {
	event: Event;
	reduceMotion: boolean | null;
};

export default function EventHeader({ event, reduceMotion }: EventHeaderProps) {
	const navigate = useNavigate();
	const start = new Date(event.startTime);
	const end = new Date(event.endTime);

	const sameDay = isSameDay(start, end);
	const dateLabel = sameDay
		? `${format(start, 'MMM d, yyyy · hh:mm aaa')} – ${format(end, 'hh:mm aaa')}`
		: `${format(start, 'MMM d, hh:mm aaa')} – ${format(end, 'MMM d, hh:mm aaa')}`;

	return (
		<motion.div
			initial={reduceMotion ? false : { opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
			className='flex items-center justify-between gap-4'
		>
			<div className='flex items-center gap-3 min-w-0'>
				<motion.button
					onClick={() => navigate(-1)}
					whileTap={reduceMotion ? undefined : { scale: 0.9 }}
					aria-label='Go back'
					className='shrink-0 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors'
				>
					<CaretLeft className='w-5 h-5' />
				</motion.button>
				<div className='min-w-0'>
					<Header className='!text-xl !tracking-tight truncate'>
						{event.title}
					</Header>
					<p className='text-sm text-white/45 truncate'>
						{event.type} at the {event.venue} · {dateLabel}
					</p>
				</div>
			</div>
			<div className='shrink-0 flex items-center gap-3'>
				<div className='hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-white/60'>
					<span className='relative flex w-2 h-2'>
						<span className='absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping' />
						<span className='relative inline-flex w-2 h-2 rounded-full bg-emerald-400' />
					</span>
					<LiveClock
						format='12'
						showSeconds
						className='tabular-nums text-white/60'
					/>
				</div>
				<EventStatusPill event={event} className='hidden sm:inline-flex' />
			</div>
		</motion.div>
	);
}
