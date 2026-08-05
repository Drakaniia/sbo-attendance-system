import Header from '../components/ui/header';
import CreateEventModal from '../modals/CreateEventModal';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../constants';
import { fetchEvents } from '../api/event';
import EventCard from '../components/EventCard';
import { useMemo, useState } from 'react';
import { countEventsStats } from '../lib/utils';
import { motion, type Variants } from 'framer-motion';
import {
	Search,
	CalendarDays,
	Activity,
	Sun,
	CalendarClock,
	CheckCircle2,
} from 'lucide-react';
import LiveClock from '../components/LiveClock';
import { StatCard } from '../components/charts/StatCard';
import { format } from 'date-fns';

const cardReveal: Variants = {
	hidden: { opacity: 0, y: 12 },
	visible: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: {
			type: 'spring',
			bounce: 0,
			duration: 0.4,
			delay: i * 0.06,
		},
	}),
};

const STAT_META = [
	{
		key: 'total',
		label: 'Total Events',
		color: '#3b82f6',
		delay: 0,
		icon: CalendarDays,
	},
	{
		key: 'ongoing',
		label: 'Ongoing',
		color: '#34d399',
		delay: 60,
		icon: Activity,
	},
	{
		key: 'today',
		label: 'Today',
		color: '#38bdf8',
		delay: 120,
		icon: Sun,
	},
	{
		key: 'upcoming',
		label: 'Upcoming',
		color: '#a78bfa',
		delay: 180,
		icon: CalendarClock,
	},
	{
		key: 'ended',
		label: 'Ended',
		color: '#f87171',
		delay: 240,
		icon: CheckCircle2,
	},
] as const;

export default function Events() {
	const [search, setSearch] = useState('');
	const { data: events, isLoading } = useQuery({
		queryFn: fetchEvents,
		queryKey: [QUERY_KEYS.EVENTS],
	});

	const stats = useMemo(() => countEventsStats(events ?? []), [events]);

	const filteredEvents = useMemo(() => {
		if (!events) return [];
		const q = search.trim().toLowerCase();
		if (!q) return events;
		return events.filter((event) =>
			[event.title, event.venue, event.type, event.description]
				.join(' ')
				.toLowerCase()
				.includes(q)
		);
	}, [events, search]);

	const statValues = useMemo(
		() => ({
			total: events?.length ?? 0,
			ongoing: stats.ongoing,
			today: stats.today,
			upcoming: stats.upcoming,
			ended: stats.ended,
		}),
		[events, stats]
	);

	return (
		<div className='flex flex-col gap-6 pb-8 -mx-5 -mt-5 px-5'>
			{/* Sticky toolbar — translucent chrome, content scrolls beneath */}
			<header className='sticky -top-5 z-20 glass-heavy pt-5 pb-4'>
				<div className='flex items-center justify-between gap-4'>
					<div>
						<Header className='!text-2xl !tracking-tight'>Events</Header>
						<p className='text-white/40 text-sm mt-1'>
							{format(new Date(), 'EEEE, MMMM d, yyyy')}
						</p>
					</div>
					<div className='flex items-center gap-3'>
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
						<CreateEventModal />
					</div>
				</div>
			</header>

			{/* Stat cards */}
			<div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4'>
				{STAT_META.map(({ key, label, color, delay, icon }) => (
					<StatCard
						key={key}
						title={label}
						value={statValues[key]}
						icon={icon}
						color={color}
						delay={delay}
					/>
				))}
			</div>

			{/* Search */}
			<div className='relative'>
				<Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none' />
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder='Search events by title, venue, or type…'
					className='w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none transition-[border-color,background-color] duration-200 focus:border-white/[0.16] focus:bg-white/[0.06]'
				/>
			</div>

			{/* Event list */}
			{isLoading ? (
				<div className='flex flex-col gap-3'>
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							className='glass rounded-2xl p-5 flex gap-4 animate-pulse'
						>
							<div className='w-16 h-20 rounded-xl bg-white/[0.06]' />
							<div className='flex-1 space-y-2'>
								<div className='h-4 w-1/3 rounded-full bg-white/[0.06]' />
								<div className='h-3 w-1/4 rounded-full bg-white/[0.04]' />
								<div className='h-3 w-2/3 rounded-full bg-white/[0.04]' />
							</div>
						</div>
					))}
				</div>
			) : filteredEvents.length === 0 ? (
				<div className='glass rounded-2xl py-16 flex flex-col items-center justify-center gap-3 text-center'>
					<div className='w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center'>
						<CalendarDays className='w-6 h-6 text-white/30' />
					</div>
					<p className='text-white/60 font-medium'>
						{search ? 'No events match your search' : 'No events yet'}
					</p>
					<p className='text-sm text-white/35 max-w-xs'>
						{search
							? 'Try a different keyword or clear the search.'
							: 'Create your first event to start tracking attendance.'}
					</p>
				</div>
			) : (
				<section className='flex flex-col gap-3'>
					{filteredEvents.map((event, i) => (
						<motion.div
							key={event._id}
							custom={i}
							initial='hidden'
							animate='visible'
							variants={cardReveal}
						>
							<EventCard event={event} />
						</motion.div>
					))}
				</section>
			)}
		</div>
	);
}
