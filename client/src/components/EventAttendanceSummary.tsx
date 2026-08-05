import { useQuery } from '@tanstack/react-query';
import type { Event } from '../types/event';
import { QUERY_KEYS } from '../constants';
import { getEventAttendanceSummary } from '../api/attendance';
import { TrendingUp } from 'lucide-react';

type EventAttendanceSummaryProps = {
	event: Event;
};

export default function EventAttendanceSummary({
	event,
}: EventAttendanceSummaryProps) {
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
			<div className='glass rounded-2xl p-5 space-y-3 animate-pulse'>
				<div className='h-4 w-1/3 rounded-full bg-white/[0.06]' />
				<div className='grid grid-cols-2 gap-3'>
					<div className='h-20 rounded-xl bg-white/[0.04]' />
					<div className='h-20 rounded-xl bg-white/[0.04]' />
				</div>
			</div>
		);
	}

	if (error || !eventAttendanceSummary) {
		return (
			<div className='glass rounded-2xl p-5 text-sm text-white/40'>
				Error loading attendance summary
			</div>
		);
	}

	const rate = Math.round(eventAttendanceSummary.rate);

	return (
		<div className='glass glass-hover rounded-2xl p-5'>
			<p className='text-[11px] font-semibold text-white/40 uppercase tracking-micro mb-4'>
				Attendance Summary
			</p>

			<div className='grid grid-cols-2 gap-3'>
				{/* Checked In */}
				<div className='rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5'>
					<div className='flex items-center gap-2 text-xs text-white/40 mb-1.5'>
						<span className='w-1.5 h-1.5 rounded-full bg-blue-400' />
						Checked In
					</div>
					<p className='text-2xl font-bold tracking-display text-white tabular-nums'>
						{eventAttendanceSummary.totalCheckedIn}
					</p>
				</div>

				{/* Checked Out */}
				<div className='rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5'>
					<div className='flex items-center gap-2 text-xs text-white/40 mb-1.5'>
						<span className='w-1.5 h-1.5 rounded-full bg-emerald-400' />
						Checked Out
					</div>
					<p className='text-2xl font-bold tracking-display text-white tabular-nums'>
						{eventAttendanceSummary.totalCheckedOut}
					</p>
				</div>
			</div>

			{/* Rate */}
			<div className='mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 flex items-center justify-between'>
				<div className='flex items-center gap-2 text-xs text-white/40'>
					<span className='w-1.5 h-1.5 rounded-full bg-violet-400' />
					Attendance Rate
				</div>
				<div className='flex items-center gap-1.5'>
					<TrendingUp className='w-3.5 h-3.5 text-violet-300' />
					<p className='text-xl font-bold tracking-display text-white tabular-nums'>
						{rate}%
					</p>
				</div>
			</div>
		</div>
	);
}
