import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ClipboardText, Clock, ArrowUpRight, Warning } from '@phosphor-icons/react';
import Header from '../components/ui/Header';
import { QUERY_KEYS } from '../constants';
import { fetchRecentAttendances } from '../api/attendance';
import { cn } from '../lib/utils';
import { motion, useReducedMotion } from 'framer-motion';

const PAGE_LIMIT = 30;

export default function Attendance() {
	const navigate = useNavigate();
	const reduceMotion = useReducedMotion();

	const {
		data: attendances,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: [QUERY_KEYS.ATTENDANCES],
		queryFn: () => fetchRecentAttendances(PAGE_LIMIT),
		staleTime: 10_000,
		refetchInterval: 30_000,
	});

	return (
		<div className="flex flex-col gap-6 pb-8 -mx-5 -mt-5 px-5">
			{/* ── Sticky header ─────────────────────────── */}
			<header className="sticky -top-5 z-20 glass-heavy pt-5 pb-4 -mx-5 px-5">
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
				>
					<div className="flex items-center justify-between gap-4">
						<div className="min-w-0">
							<Header className="!text-2xl !tracking-tight truncate">Attendance</Header>
							<p className="text-white/40 text-sm mt-1 truncate">
								Recently recorded attendance across all events
							</p>
						</div>
						<div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-white/60">
							<span className="relative flex w-2 h-2">
								<span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
								<span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
							</span>
							<span className="tabular-nums">{attendances?.length ?? 0} records</span>
						</div>
					</div>
				</motion.div>
			</header>

			{/* ── Error banner ──────────────────────────── */}
			{isError && (
				<div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-5 py-3 flex items-center justify-between gap-3 text-sm text-red-300 motion-safe:animate-[fadeIn_0.4s_ease-out_forwards]">
					<div className="flex items-center gap-3">
						<Warning className="w-4 h-4 shrink-0" />
						Failed to load attendance data.
					</div>
					<button
						onClick={() => refetch()}
						className="shrink-0 px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/20 text-red-300 text-xs font-medium transition-[background-color,transform] duration-150 ease-apple-out hover:bg-red-500/25 active:scale-[0.97]"
					>
						Retry
					</button>
				</div>
			)}

			{/* ── Loading skeleton ──────────────────────── */}
			{isLoading && (
				<div className="glass rounded-2xl p-5 space-y-3">
					{Array.from({ length: 8 }).map((_, i) => (
						<div
							key={i}
							className="h-11 rounded-lg bg-white/[0.03] animate-pulse"
							style={{ animationDelay: `${i * 50}ms` }}
						/>
					))}
				</div>
			)}

			{/* ── Table ─────────────────────────────────── */}
			{!isLoading && attendances && attendances.length > 0 && (
				<div className="glass glass-hover rounded-2xl p-5">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="text-base font-semibold text-white tracking-tight">
								Recent Attendance
							</h3>
							<p className="text-xs text-white/30 mt-0.5">
								Latest {PAGE_LIMIT} records — updates every 30 seconds
							</p>
						</div>
						<Clock className="w-4 h-4 text-white/30" />
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-white/[0.06]">
									<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
										Student ID
									</th>
									<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
										Name
									</th>
									<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
										Event
									</th>
									<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
										Time In
									</th>
									<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
										Time Out
									</th>
									<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
										Status
									</th>
									<th className="text-left py-3 px-3 text-xs font-medium text-white/30 uppercase tracking-wider">
										Recorded
									</th>
								</tr>
							</thead>
							<tbody>
								{attendances.map((att, i) => {
									const event = att.event;
									const fullName =
										`${att.student?.firstname ?? ''} ${att.student?.lastname ?? ''}`.trim() ||
										'N/A';
									const hasTimeIn = !!att.timeIn;
									const hasTimeOut = !!att.timeOut;
									const status =
										hasTimeIn && hasTimeOut
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
											key={att._id}
											className={cn(
												'border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]',
												'motion-safe:opacity-0 motion-safe:animate-[fadeIn_0.4s_ease-out_forwards]'
											)}
											style={{ animationDelay: `${i * 50}ms` }}
										>
											<td className="py-3 px-3 text-white/70 font-mono text-xs">{att.studentID}</td>
											<td className="py-3 px-3 text-white/80 font-medium text-sm">{fullName}</td>
											<td className="py-3 px-3 min-w-[140px]">
												<div className="flex items-center gap-2">
													{' '}
													<span className="text-white/60 text-sm truncate max-w-[160px]">
														{event?.title ?? 'N/A'}
													</span>
													{event && (
														<button
															type="button"
															onClick={() => navigate(`/admin/events/${event._id}`)}
															className="shrink-0 text-white/25 hover:text-white/60 transition-colors"
															aria-label={`Go to ${event.title}`}
														>
															<ArrowUpRight className="w-3.5 h-3.5" />
														</button>
													)}
												</div>
											</td>
											<td className="py-3 px-3 text-white/60 font-mono text-xs">
												{att.timeIn ? format(new Date(att.timeIn), 'hh:mm a') : '—'}
											</td>
											<td className="py-3 px-3 text-white/60 font-mono text-xs">
												{att.timeOut ? format(new Date(att.timeOut), 'hh:mm a') : '—'}
											</td>
											<td className="py-3 px-3">
												<span
													className={cn(
														'px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
														statusColor
													)}
												>
													{status}
												</span>
											</td>
											<td className="py-3 px-3 text-white/40 text-xs whitespace-nowrap">
												{att.updatedAt ? format(new Date(att.updatedAt), 'MMM d, h:mm a') : '—'}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* ── Empty state ───────────────────────────── */}
			{!isLoading && attendances && attendances.length === 0 && (
				<div className="glass rounded-2xl p-5 flex flex-col items-center justify-center py-16 text-white/20">
					<ClipboardText className="w-12 h-12 mb-3" />
					<p className="text-sm">No attendance records yet</p>
					<p className="text-xs text-white/15 mt-1">
						Records will appear here once students are scanned at an event
					</p>
				</div>
			)}
		</div>
	);
}
