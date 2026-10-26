import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ClipboardText, ArrowUpRight, Warning } from '@phosphor-icons/react';
import PageHeader from '../components/ui/PageHeader';
import PanelHeading from '../components/ui/PanelHeading';
import { QUERY_KEYS } from '../constants';
import { fetchRecentAttendances } from '../api/attendance';
import { cn } from '../lib/utils';

const PAGE_LIMIT = 30;

export default function Attendance() {
	const navigate = useNavigate();

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
		<div className="flex flex-col gap-5 pb-4">
			<PageHeader
				eyebrow={
					<>
						<span>{format(new Date(), 'EEEE, MMMM d')}</span>
						<span className="h-[3px] w-[3px] rounded-full bg-white/20" />
						<span className="tabular-nums">{attendances?.length ?? 0} recent records</span>
					</>
				}
				title="Attendance"
				description="Every scan, newest first — the raw record behind the reports."
				actions={
					<span className="control h-8 gap-1.5 px-2.5 text-[11px]">
						<span className="h-1.5 w-1.5 rounded-full bg-[#43d7b0] motion-safe:animate-pulse" />
						Live
					</span>
				}
			/>

			{/* ── Error banner ──────────────────────────── */}
			{isError && (
				<div className="flex items-center justify-between gap-3 rounded-2xl border border-[#f07c9a]/20 bg-[#f07c9a]/[0.06] px-4 py-3 motion-safe:animate-[fadeIn_0.4s_ease-out_forwards]">
					<div className="flex items-center gap-2.5 text-[12px] text-[#ffb3c2]/90">
						<Warning className="h-4 w-4 shrink-0" />
						Failed to load attendance data.
					</div>
					<button onClick={() => refetch()} className="control h-7 shrink-0 px-2.5 text-[11px]">
						Retry
					</button>
				</div>
			)}

			{/* ── Loading skeleton ──────────────────────── */}
			{isLoading && (
				<div className="panel space-y-3 p-5">
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
				<div className="panel overflow-hidden">
					<div className="px-6 pb-4 pt-6">
						<PanelHeading
							eyebrow="Log"
							title="Recent attendance"
							action={<p className="shrink-0 text-[10.5px] text-white/24">Updates every 30s</p>}
						/>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-y border-white/[0.055] bg-white/[0.012]">
									{['Student ID', 'Name', 'Event', 'Time in', 'Time out', 'Status', 'Recorded'].map(
										(head) => (
											<th
												key={head}
												className="whitespace-nowrap px-3 py-3 text-left text-[9.5px] font-semibold uppercase tracking-micro text-white/28 first:pl-6 last:pr-6"
											>
												{head}
											</th>
										)
									)}
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

									const statusMeta =
										status === 'Complete'
											? { color: '#7ee8c9', dot: '#43d7b0', bg: 'rgba(67,215,176,0.10)' }
											: status === 'Checked In'
												? { color: '#9bbcff', dot: '#6e9bff', bg: 'rgba(110,155,255,0.10)' }
												: status === 'Checked Out'
													? { color: '#ffd79a', dot: '#f5b85b', bg: 'rgba(245,184,91,0.10)' }
													: {
															color: 'rgba(235,235,245,0.42)',
															dot: 'rgba(235,235,245,0.28)',
															bg: 'rgba(255,255,255,0.04)',
														};

									return (
										<tr
											key={att._id}
											className={cn(
												'border-b border-white/[0.035] transition-colors hover:bg-white/[0.022]',
												'motion-safe:opacity-0 motion-safe:animate-[fadeIn_0.4s_ease-out_forwards]'
											)}
											style={{ animationDelay: `${i * 50}ms` }}
										>
											<td className="py-3.5 pl-6 pr-3 text-[11px] tabular-nums tracking-[0.02em] text-white/45">
												{att.studentID}
											</td>
											<td className="px-3 py-3.5 text-[12.5px] font-medium text-white/82">
												{fullName}
											</td>
											<td className="py-3 px-3 min-w-[140px]">
												<div className="flex items-center gap-1.5">
													<span className="text-white/58 text-[12.5px] truncate max-w-[170px]">
														{event?.title ?? 'N/A'}
													</span>
													{event && (
														<button
															type="button"
															onClick={() => navigate(`/admin/events/${event._id}`)}
															className="shrink-0 rounded-full p-0.5 text-white/18 transition-colors hover:text-white/60"
															aria-label={`Go to ${event.title}`}
														>
															<ArrowUpRight className="w-3 h-3" />
														</button>
													)}
												</div>
											</td>
											<td className="py-3 px-3 text-[11.5px] tabular-nums text-white/55">
												{att.timeIn ? format(new Date(att.timeIn), 'h:mm a') : '—'}
											</td>
											<td className="py-3 px-3 text-[11.5px] tabular-nums text-white/55">
												{att.timeOut ? format(new Date(att.timeOut), 'h:mm a') : '—'}
											</td>
											<td className="py-3 px-3">
												<span
													className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[4px] text-[10px] font-semibold uppercase tracking-micro"
													style={{ color: statusMeta.color, background: statusMeta.bg }}
												>
													<span
														className="h-1 w-1 rounded-full"
														style={{ background: statusMeta.dot }}
													/>
													{status}
												</span>
											</td>
											<td className="py-3 px-3 text-white/34 text-[11.5px] whitespace-nowrap">
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
				<div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
					<div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
						<ClipboardText className="h-5 w-5 text-white/25" />
					</div>
					<p className="text-[13px] font-medium text-white/55">No attendance records yet</p>
					<p className="mt-1 max-w-[34ch] text-[11.5px] leading-relaxed text-white/28">
						Records will appear here once students are scanned at an event.
					</p>
				</div>
			)}
		</div>
	);
}
