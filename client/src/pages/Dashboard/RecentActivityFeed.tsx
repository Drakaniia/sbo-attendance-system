import { Clock, ClipboardText } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import type { RecentActivityData } from '../../api/dashboard';

type RecentActivityFeedProps = {
	activities: RecentActivityData[] | undefined;
};

export default function RecentActivityFeed({
	activities,
}: RecentActivityFeedProps) {
	return (
		<div className='glass glass-hover rounded-2xl p-5'>
			<div className='flex items-center justify-between mb-4'>
				<div>
					<h3 className='text-base font-semibold text-white tracking-tight'>
						Recent Activity
					</h3>
					<p className='text-xs text-white/30 mt-0.5'>
						Latest attendance records across all events
					</p>
				</div>
				<Clock className='w-4 h-4 text-white/30' />
			</div>

			{activities && activities.length > 0 ? (
				<div className='overflow-x-auto'>
					<table className='w-full text-sm'>
						<thead>
							<tr className='border-b border-white/[0.06]'>
								<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
									Student ID
								</th>
								<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
									Name
								</th>
								<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
									Event
								</th>
								<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
									Time In
								</th>
								<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
									Time Out
								</th>
								<th className='text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider'>
									Status
								</th>
							</tr>
						</thead>
						<tbody>
							{activities.map((activity, i) => {
								const fullName =
									`${activity.student?.firstname ?? ''} ${activity.student?.lastname ?? ''}`.trim() ||
									'N/A';
								const hasTimeIn = !!activity.timeIn;
								const hasTimeOut = !!activity.timeOut;
								const status = hasTimeIn && hasTimeOut
									? 'Complete'
									: hasTimeIn
										? 'Checked In'
										: hasTimeOut
											? 'Checked Out'
											: 'Pending';

								const statusColor =
									status === 'Complete'
										? 'text-emerald-400 bg-emerald-400/10'
										: status === 'Checked In'
											? 'text-blue-400 bg-blue-400/10'
											: status === 'Checked Out'
												? 'text-amber-400 bg-amber-400/10'
												: 'text-white/30 bg-white/[0.04]';

								return (
									<tr
										key={activity._id}
										className={cn(
											'border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]',
											'motion-safe:opacity-0 motion-safe:animate-[fadeIn_0.4s_ease-out_forwards]'
										)}
										style={{
											animationDelay: `${i * 60}ms`,
										}}
									>
										<td className='py-3 px-3 text-white/70 font-mono text-xs'>
											{activity.studentID}
										</td>
										<td className='py-3 px-3 text-white/80 font-medium'>
											{fullName}
										</td>
										<td className='py-3 px-3 text-white/50 text-xs'>
											{activity.event?.title ?? 'N/A'}
										</td>
										<td className='py-3 px-3 text-white/60 font-mono text-xs'>
											{activity.timeIn
												? format(
														new Date(activity.timeIn),
														'hh:mm a'
													)
												: '—'}
										</td>
										<td className='py-3 px-3 text-white/60 font-mono text-xs'>
											{activity.timeOut
												? format(
														new Date(activity.timeOut),
														'hh:mm a'
													)
												: '—'}
										</td>
										<td className='py-3 px-3'>
											<span
												className={cn(
													'px-2 py-0.5 rounded-full text-[11px] font-medium',
													statusColor
												)}
											>
												{status}
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : (
				<div className='flex flex-col items-center justify-center py-12 text-white/20'>
					<ClipboardText className='w-10 h-10 mb-2' />
					<p className='text-sm'>No recent activity yet</p>
				</div>
			)}
		</div>
	);
}
