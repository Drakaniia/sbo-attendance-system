import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import {
	MagnifyingGlass,
	Calendar,
	Pulse,
	Sun,
	Timer,
	CheckCircle,
	WarningCircle,
	X,
} from '@phosphor-icons/react';
import PageHeader from '../components/ui/PageHeader';
import MetricStrip from '../components/ui/MetricStrip';
import CreateEventModal from '../components/modals/CreateEventModal';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../constants';
import { fetchEvents } from '../api/event';
import EventCard from '../components/EventCard';
import { countEventsStats } from '../lib/utils';

export default function Events() {
	const reduceMotion = useReducedMotion();
	const [search, setSearch] = useState('');

	const {
		data: events,
		isLoading,
		error,
	} = useQuery({
		queryFn: fetchEvents,
		queryKey: [QUERY_KEYS.EVENTS],
	});

	const stats = useMemo(() => countEventsStats(events ?? []), [events]);

	const filteredEvents = useMemo(() => {
		if (!events) return [];
		const query = search.trim().toLowerCase();
		if (!query) return events;
		return events.filter((event) =>
			[event.title, event.venue, event.type, event.description]
				.join(' ')
				.toLowerCase()
				.includes(query)
		);
	}, [events, search]);

	return (
		<div className="flex flex-col gap-5 pb-4">
			<PageHeader
				eyebrow={
					<>
						<span>{format(new Date(), 'EEEE, MMMM d')}</span>
						<span className="h-[3px] w-[3px] rounded-full bg-white/20" />
						<span>{events?.length ?? 0} events</span>
					</>
				}
				title="Events"
				description="Plan the schedule, run the desk, and review every gathering."
				actions={<CreateEventModal />}
			/>

			<MetricStrip
				className="lg:grid-cols-5"
				items={[
					{
						label: 'All events',
						value: events?.length ?? 0,
						icon: Calendar,
						accent: '#8fb4ff',
						hint: 'In the archive and active',
					},
					{
						label: 'Ongoing',
						value: stats.ongoing,
						icon: Pulse,
						accent: '#7ee8c9',
						hint: 'Happening right now',
					},
					{
						label: 'Today',
						value: stats.today,
						icon: Sun,
						accent: '#9ff0e8',
						hint: 'Starts later today',
					},
					{
						label: 'Upcoming',
						value: stats.upcoming,
						icon: Timer,
						accent: '#cdc2ff',
						hint: 'Scheduled ahead',
					},
					{
						label: 'Ended',
						value: stats.ended,
						icon: CheckCircle,
						accent: 'rgba(235,235,245,0.32)',
						hint: 'Attendance closed',
					},
				]}
			/>

			{/* Search */}
			<div className="flex items-center gap-4">
				<div className="well flex h-11 flex-1 items-center gap-2.5 rounded-2xl px-4 transition-[border-color,background-color] duration-200 focus-within:border-white/[0.14] focus-within:bg-white/[0.035]">
					<MagnifyingGlass className="h-4 w-4 shrink-0 text-white/26" />
					<input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search by title, venue, or type"
						className="h-full flex-1 bg-transparent text-[13px] text-white/85 outline-none placeholder:text-white/26"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch('')}
							aria-label="Clear search"
							className="rounded-full p-1 text-white/30 transition-colors hover:bg-white/[0.07] hover:text-white/70 active:scale-90"
						>
							<X className="h-3 w-3" />
						</button>
					)}
				</div>
				<p className="hidden shrink-0 text-[11.5px] tabular-nums text-white/26 sm:block">
					{filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
				</p>
			</div>

			{/* Event list */}
			{isLoading ? (
				<div className="flex flex-col gap-2.5">
					{[0, 1, 2].map((index) => (
						<div key={index} className="panel flex animate-pulse gap-4 rounded-[22px] p-4">
							<div className="h-16 w-14 rounded-xl bg-white/[0.05]" />
							<div className="flex-1 space-y-2.5 py-1">
								<div className="h-3.5 w-1/3 rounded-full bg-white/[0.06]" />
								<div className="h-3 w-1/4 rounded-full bg-white/[0.04]" />
								<div className="h-3 w-2/3 rounded-full bg-white/[0.035]" />
							</div>
						</div>
					))}
				</div>
			) : error && !events ? (
				<div
					role="alert"
					className="panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
				>
					<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f07c9a]/20 bg-[#f07c9a]/[0.08]">
						<WarningCircle className="h-5 w-5 text-[#ff9dae]" />
					</div>
					<p className="text-[13px] font-medium text-white/70">Events couldn't be loaded</p>
					<p className="max-w-xs text-[11.5px] leading-relaxed text-white/32">
						{error instanceof Error ? error.message : 'Unknown error'}
					</p>
				</div>
			) : filteredEvents.length === 0 ? (
				<div className="panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
					<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
						<Calendar className="h-5 w-5 text-white/25" />
					</div>
					<p className="text-[13px] font-medium text-white/55">
						{search ? 'No events match your search' : 'No events yet'}
					</p>
					<p className="max-w-xs text-[11.5px] leading-relaxed text-white/28">
						{search
							? 'Try a different keyword or clear the search.'
							: 'Create your first event to start tracking attendance.'}
					</p>
				</div>
			) : (
				<section className="flex flex-col gap-2.5">
					{filteredEvents.map((event, index) => (
						<motion.div
							key={event._id}
							initial={reduceMotion ? false : { opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={
								reduceMotion
									? { duration: 0 }
									: {
											type: 'spring',
											bounce: 0,
											duration: 0.42,
											delay: Math.min(index * 0.035, 0.25),
										}
							}
						>
							<EventCard event={event} />
						</motion.div>
					))}
				</section>
			)}
		</div>
	);
}
