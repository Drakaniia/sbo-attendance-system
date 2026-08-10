import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlass, Check, Calendar, Plus } from '@phosphor-icons/react';
import AppleModal from '../ui/AppleModal';
import { fetchEvents } from '../../api/event';
import EventStatusPill from '../EventStatusPill';
import { cn } from '../../lib/utils';
import type { Event } from '../../types/event';

type EventPickerModalProps = {
	opened: boolean;
	onClose: () => void;
	selectedEventId: string | null;
	onSelect: (event: Event | null) => void;
	/** Optional callback to open the Create Event modal */
	onCreateEvent?: () => void;
};

export default function EventPickerModal({
	opened,
	onClose,
	selectedEventId,
	onSelect,
	onCreateEvent,
}: EventPickerModalProps) {
	const [search, setSearch] = useState('');

	const { data: events = [], isLoading } = useQuery({
		queryKey: ['events'],
		queryFn: fetchEvents,
		staleTime: 300_000,
		enabled: opened,
	});

	const filteredEvents = useMemo(() => {
		if (!search.trim()) return events;
		const q = search.toLowerCase();
		return events.filter(
			(e) =>
				e.title.toLowerCase().includes(q) ||
				e.type.toLowerCase().includes(q) ||
				e.venue.toLowerCase().includes(q),
		);
	}, [events, search]);

	const handleSelect = (event: Event | null) => {
		onSelect(event);
		onClose();
	};

	return (
		<AppleModal
			opened={opened}
			onClose={onClose}
			title="Select Event"
			subtitle="Choose an event to filter reports"
			size="md"
		>
			{/* Search bar */}
			<div className="relative mb-3">
				<MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search events…"
					className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/25 outline-none transition-[border-color,background-color] duration-200 focus:border-indigo-400/40 focus:bg-white/[0.06]"
					autoFocus
				/>
			</div>

			{/* Event list */}
			<div className="max-h-64 overflow-y-auto space-y-1 -mx-1 px-1">
				{/* "All Events" option (always visible, always at top) */}
				<button
					type="button"
					onClick={() => handleSelect(null)}
					className={cn(
						'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors',
						selectedEventId === null
							? 'text-white bg-indigo-400/[0.1]'
							: 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
					)}
				>
					<div className="flex items-center gap-2.5">
						<Calendar className="w-4 h-4 text-indigo-400/60" />
						<span className="font-medium">All Events</span>
					</div>
					{selectedEventId === null && (
						<Check className="w-4 h-4 text-indigo-400 shrink-0" />
					)}
				</button>

				{/* Divider */}
				<div className="my-1 border-t border-white/[0.06]" />

				{/* Loading state */}
				{isLoading &&
					Array.from({ length: 5 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="flex items-center gap-3 px-3 py-2.5"
						>
							<div className="w-4 h-4 rounded bg-white/[0.04] animate-pulse" />
							<div
								className="h-3 rounded bg-white/[0.04] animate-pulse flex-1"
								style={{ animationDelay: `${i * 100}ms` }}
							/>
						</div>
					))}

				{/* Empty state */}
				{!isLoading && filteredEvents.length === 0 && (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Calendar className="w-10 h-10 text-white/10 mb-3" />
						<p className="text-sm text-white/30">
							{search.trim()
								? 'No events match your search'
								: 'No events found'}
						</p>
						{onCreateEvent && (
							<button
								type="button"
								onClick={() => {
									onClose();
									onCreateEvent();
								}}
								className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs font-medium transition-colors"
							>
								<Plus className="w-3.5 h-3.5" />
								Create Event
							</button>
						)}
					</div>
				)}

				{/* Event items */}
				{!isLoading &&
					filteredEvents.map((event) => {
						const isSelected = selectedEventId === event._id;
						return (
							<button
								key={event._id}
								type="button"
								onClick={() => handleSelect(event)}
								className={cn(
									'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors',
									isSelected
										? 'text-white bg-indigo-400/[0.1]'
										: 'text-white/60 hover:text-white hover:bg-white/[0.04]',
								)}
							>
								<div className="flex items-center gap-2.5 min-w-0">
									<div
										className={cn(
											'w-2 h-2 rounded-full shrink-0',
											isSelected
												? 'bg-indigo-400'
												: 'bg-white/20',
										)}
									/>
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">
											{event.title}
										</p>
										<p className="text-[11px] text-white/30 mt-0.5">
											{event.type}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2 shrink-0">
								<EventStatusPill event={event} size="sm" />
									{isSelected && (
										<Check className="w-4 h-4 text-indigo-400" />
									)}
								</div>
							</button>
						);
					})}
			</div>
		</AppleModal>
	);
}
