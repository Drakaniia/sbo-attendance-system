import { useQuery } from '@tanstack/react-query';
import type { Event } from '../types/event';
import { QUERY_KEYS } from '../constants';
import { getEventAttendanceSummary } from '../api/attendance';
import { TrendUp } from '@phosphor-icons/react';

type EventAttendanceSummaryProps = {
	event: Event;
};

export default function EventAttendanceSummary({ event }: EventAttendanceSummaryProps) {
	const {
		data: eventAttendanceSummary,
		isLoading,
		error,
	} = useQuery({
		queryKey: [QUERY_KEYS.EVENT_ATTENDANCE_SUMMARY, event._id],
		queryFn: () => getEventAttendanceSummary(event._id),
	});

	if (isLoading) {
		return (
			<div className="panel space-y-3 p-5 animate-pulse">
				<div className="h-4 w-1/3 rounded-full bg-white/[0.06]" />
				<div className="grid grid-cols-2 gap-3">
					<div className="h-20 rounded-xl bg-white/[0.04]" />
					<div className="h-20 rounded-xl bg-white/[0.04]" />
				</div>
			</div>
		);
	}

	if (error || !eventAttendanceSummary) {
		return (
			<div className="panel p-5 text-[12px] text-white/40">Error loading attendance summary</div>
		);
	}

	const rate = Math.round(eventAttendanceSummary.rate);

	return (
		<div className="panel p-5">
			<p className="eyebrow mb-4">Attendance summary</p>

			<div className="grid grid-cols-2 gap-3">
				{/* Checked In */}
				<div className="well p-3.5">
					<div className="mb-1.5 flex items-center gap-2 text-[10.5px] text-white/35">
						<span className="h-1.5 w-1.5 rounded-full bg-[#6e9bff]" />
						Checked in
					</div>
					<p className="text-2xl font-bold tracking-display text-white tabular-nums">
						{eventAttendanceSummary.totalCheckedIn}
					</p>
				</div>

				{/* Checked Out */}
				<div className="well p-3.5">
					<div className="mb-1.5 flex items-center gap-2 text-[10.5px] text-white/35">
						<span className="h-1.5 w-1.5 rounded-full bg-[#43d7b0]" />
						Checked out
					</div>
					<p className="text-2xl font-bold tracking-display text-white tabular-nums">
						{eventAttendanceSummary.totalCheckedOut}
					</p>
				</div>
			</div>

			{/* Rate */}
			<div className="well mt-3 flex items-center justify-between p-3.5">
				<div className="flex items-center gap-2 text-[10.5px] text-white/35">
					<span className="h-1.5 w-1.5 rounded-full bg-[#cdc2ff]" />
					Completion
				</div>
				<div className="flex items-center gap-1.5">
					<TrendUp className="h-3.5 w-3.5 text-[#cdc2ff]/70" />
					<p className="numeric text-[19px] font-semibold tracking-display text-white tabular-nums">
						{rate}%
					</p>
				</div>
			</div>
		</div>
	);
}
