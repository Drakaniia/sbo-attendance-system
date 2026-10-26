import { format, isSameDay } from 'date-fns';
import type { Event } from '../types/event';
import { Link } from 'react-router-dom';
import { cn, getEventStatusInfo, EVENT_STATUS_META } from '../lib/utils';
import { queryClient } from '../main';
import { archiveEvent } from '../api/event';
import { useNotification } from '../hooks/useNotification';
import { QUERY_KEYS } from '../constants';
import { useState } from 'react';
import { Archive, ArrowUpRight, Check, Clock, X } from '@phosphor-icons/react';
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
			notification({ title: 'Event archived', message: '' });
			await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENTS] });
		} catch (error) {
			console.error('Failed to archive event', error);
			notification({
				title: 'Failed to archive event',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		} finally {
			setConfirmDelete(false);
		}
	};

	return (
		<article className="panel panel-interactive group flex items-stretch gap-4 rounded-[22px] p-4">
			{/* Date tile */}
			<Link
				to={`/admin/events/${event._id}`}
				className={cn(
					'shrink-0 flex w-[58px] flex-col items-center justify-center overflow-hidden rounded-[13px] border transition-[transform,filter] duration-150 ease-apple-out active:scale-[0.96]',
					meta.tile
				)}
			>
				<span className="w-full border-b border-black/[0.14] py-1.5 text-center text-[9px] font-semibold uppercase tracking-micro opacity-80">
					{format(start, 'MMM')}
				</span>
				<span className="w-full py-1.5 text-center text-[21px] font-semibold leading-none tracking-display">
					{format(start, 'd')}
				</span>
			</Link>

			{/* Body */}
			<div className="flex min-w-0 flex-1 flex-col py-0.5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<Link
							to={`/admin/events/${event._id}`}
							className="group/title inline-flex max-w-full items-center gap-1.5"
						>
							<h3 className="truncate text-[14.5px] font-semibold tracking-title text-[#f5f5f7] transition-colors duration-150 group-hover/title:text-[#9bbcff]">
								{event.title}
							</h3>
							<ArrowUpRight className="h-3 w-3 shrink-0 text-white/0 transition-[color,transform] duration-200 ease-apple-out group-hover/title:-translate-y-0.5 group-hover/title:translate-x-0.5 group-hover/title:text-white/35" />
						</Link>
						<p className="mt-1 truncate text-[11.5px] text-white/34">
							{event.type} <span className="text-white/18">·</span> {event.venue}
						</p>
					</div>
					<EventStatusPill event={event} className="shrink-0" />
				</div>

				{event.description && (
					<p className="mt-1.5 line-clamp-1 text-[11.5px] leading-relaxed text-white/26">
						{event.description}
					</p>
				)}

				<div className="mt-auto flex items-center justify-between gap-3 pt-2.5">
					<p className="flex min-w-0 items-center gap-1.5 truncate text-[11px] tabular-nums text-white/30">
						<Clock className="h-3 w-3 shrink-0 text-white/22" />
						{format(start, 'MMM d, h:mm aaa')}
						{isSameDay(start, end)
							? ` – ${format(end, 'h:mm aaa')}`
							: ` – ${format(end, 'MMM d, h:mm aaa')}`}
					</p>

					<div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
						<EditEventModal event={event} />
						{confirmDelete ? (
							<>
								<button
									type="button"
									onClick={() => onDelete(event._id)}
									aria-label="Confirm archive"
									title="Confirm archive"
									className="group/btn rounded-full p-2 text-[#ff9dae] transition-colors hover:bg-[#f07c9a]/15 active:bg-[#f07c9a]/20"
								>
									<Check className="h-4 w-4 transition-transform duration-150 ease-apple-out group-active/btn:scale-90" />
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									aria-label="Cancel"
									title="Cancel"
									className="group/btn rounded-full p-2 text-white/45 transition-colors hover:bg-white/[0.08] active:bg-white/[0.12]"
								>
									<X className="h-4 w-4 transition-transform duration-150 ease-apple-out group-active/btn:scale-90" />
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={() => onDelete(event._id)}
								aria-label="Archive event"
								title="Archive event"
								className="group/btn rounded-full p-2 text-white/40 transition-colors hover:bg-[#f07c9a]/10 hover:text-[#ff9dae] active:bg-[#f07c9a]/10"
							>
								<Archive className="h-4 w-4 transition-transform duration-150 ease-apple-out group-active/btn:scale-90" />
							</button>
						)}
					</div>
				</div>
			</div>
		</article>
	);
}
