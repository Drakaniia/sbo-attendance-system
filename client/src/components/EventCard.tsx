import { format, isSameDay } from 'date-fns';
import type { Event } from '../types/event';
import { Link } from 'react-router-dom';
import { cn, getEventStatusInfo, EVENT_STATUS_META } from '../lib/utils';
import { queryClient } from '../main';
import { archiveEvent } from '../api/event';
import { useNotification } from '../hooks/useNotification';
import { QUERY_KEYS } from '../constants';
import { useState } from 'react';
import { Archive, Check, Clock, X } from '@phosphor-icons/react';
import EditEventModal from './modals/EditEventModal';
import EventStatusPill from './EventStatusPill';

type EventCardProps = {
	event: Event;
};

export default function EventCard({ event }: EventCardProps) {
	const notification = useNotification();
	const [confirmDelete, setConfirmDelete] = useState(false);
	const start = new Date(event.startTime);
	const end = new Date(event.endTime);
	const status = getEventStatusInfo(start, end);
	const meta = EVENT_STATUS_META[status];

	const onDelete = async (eventID: string) => {
		if (!confirmDelete) {
			setConfirmDelete(true);
			return;
		}
		try {
			await archiveEvent(eventID);

			notification({
				title: 'Event archived',
				message: '',
			});
			await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENTS] });
		} catch (error) {
			console.error('Failed to archive event', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			notification({
				title: 'Failed to archive event',
				message,
			});
		} finally {
			setConfirmDelete(false);
		}
	};

	return (
		<div className="group glass glass-hover lift rounded-2xl p-4 sm:p-5 flex items-stretch gap-4">
			{/* Apple Calendar date tile */}
			<Link
				to={`/admin/events/${event._id}`}
				className={cn(
					'shrink-0 flex flex-col items-center justify-center w-16 rounded-xl border overflow-hidden transition-transform duration-150 ease-apple-out active:scale-95',
					meta.tile
				)}
			>
				<span className="w-full text-center text-[10px] font-semibold uppercase tracking-micro py-1 border-b border-white/10">
					{format(start, 'MMM')}
				</span>
				<span className="w-full text-center text-2xl font-bold tracking-display py-1">
					{format(start, 'd')}
				</span>
			</Link>

			{/* Body */}
			<div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<Link to={`/admin/events/${event._id}`}>
							<h3 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate transition-colors hover:text-blue-400 active:text-blue-300">
								{event.title}
							</h3>
						</Link>
						<p className="text-sm text-white/45 truncate">
							{event.type} at the {event.venue}
						</p>
					</div>
					<EventStatusPill event={event} className="shrink-0" />
				</div>

				{event.description && (
					<p className="text-sm text-white/40 leading-relaxed line-clamp-2">{event.description}</p>
				)}

				{/* Time row */}
				<div className="mt-auto pt-2 flex items-center justify-between gap-3">
					<p className="flex items-center gap-1.5 text-xs text-white/40 tabular-nums">
						<Clock className="w-3.5 h-3.5 shrink-0" />
						{format(start, 'MMM d, hh:mm aaa')}
						{isSameDay(start, end)
							? ` – ${format(end, 'hh:mm aaa')}`
							: ` – ${format(end, 'MMM d, hh:mm aaa')}`}
					</p>

					{/* Actions — revealed on hover (desktop) / always tappable */}
					<div className="flex items-center gap-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity duration-200">
						<EditEventModal event={event} />
						{confirmDelete ? (
							<>
								<button
									type="button"
									onClick={() => onDelete(event._id)}
									aria-label="Confirm archive"
									title="Confirm archive"
									className="group/btn p-2 rounded-full text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors active:bg-red-400/20"
								>
									<Check className="w-4 h-4 transition-transform duration-150 ease-apple-out group-active/btn:scale-90" />
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									aria-label="Cancel"
									title="Cancel"
									className="group/btn p-2 rounded-full text-white/50 hover:bg-white/[0.08] transition-colors active:bg-white/[0.12]"
								>
									<X className="w-4 h-4 transition-transform duration-150 ease-apple-out group-active/btn:scale-90" />
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={() => onDelete(event._id)}
								aria-label="Archive event"
								title="Archive event"
								className="group/btn p-2 rounded-full text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors active:bg-red-400/10"
							>
								<Archive className="w-4 h-4 transition-transform duration-150 ease-apple-out group-active/btn:scale-90" />
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
