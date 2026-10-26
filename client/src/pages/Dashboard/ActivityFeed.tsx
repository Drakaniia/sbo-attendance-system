import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { CaretRight, ClipboardText } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import type { RecentActivityData } from '../../api/dashboard';

const AVATAR_STYLES = [
	'bg-[#5b8def]/15 text-[#a8c4ff]',
	'bg-[#4fd1c5]/15 text-[#9ff0e8]',
	'bg-[#9f8cf6]/15 text-[#cdc2ff]',
	'bg-[#f5b85b]/15 text-[#ffd79a]',
	'bg-[#6fd08c]/15 text-[#b2ecc3]',
	'bg-[#f07c9a]/15 text-[#ffb8c8]',
];

const STATUS_META = {
	complete: { label: 'Complete', color: '#43d7b0', bg: 'rgba(67,215,176,0.10)' },
	'checked-in': { label: 'Checked in', color: '#8fb4ff', bg: 'rgba(110,155,255,0.10)' },
	'checked-out': { label: 'Checked out', color: '#f5b85b', bg: 'rgba(245,184,91,0.10)' },
	pending: { label: 'Pending', color: 'rgba(235,235,245,0.35)', bg: 'rgba(255,255,255,0.04)' },
} as const;

type StatusKey = keyof typeof STATUS_META;

function avatarStyle(seed: string) {
	let hash = 0;
	for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	return AVATAR_STYLES[hash % AVATAR_STYLES.length];
}

function statusOf(record: RecentActivityData): StatusKey {
	const hasIn = Boolean(record.timeIn);
	const hasOut = Boolean(record.timeOut);
	if (hasIn && hasOut) return 'complete';
	if (hasIn) return 'checked-in';
	if (hasOut) return 'checked-out';
	return 'pending';
}

function initials(first?: string, last?: string) {
	return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '—';
}

type ActivityFeedProps = {
	activities: RecentActivityData[] | undefined;
};

/** A quiet timeline of the latest scans — the human trace behind the charts. */
export default function ActivityFeed({ activities }: ActivityFeedProps) {
	if (!activities || activities.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
				<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
					<ClipboardText className="h-5 w-5 text-white/25" />
				</div>
				<p className="mt-1 text-[13px] font-medium text-white/45">No scans recorded yet</p>
				<p className="max-w-[32ch] text-[11.5px] leading-relaxed text-white/25">
					The latest check-ins and check-outs will stream in here as students arrive.
				</p>
			</div>
		);
	}

	return (
		<ol className="relative -mx-2">
			{/* Connecting rail */}
			<span
				aria-hidden
				className="absolute bottom-5 left-[27px] top-5 w-px bg-gradient-to-b from-white/[0.02] via-white/[0.07] to-white/[0.02]"
			/>

			{activities.map((activity, index) => {
				const status = statusOf(activity);
				const meta = STATUS_META[status];
				const first = activity.student?.firstname;
				const last = activity.student?.lastname;
				const name = `${first ?? ''} ${last ?? ''}`.trim() || 'Unknown student';
				const stamp = activity.timeOut ?? activity.timeIn ?? activity.updatedAt;
				const eventId = activity.event?._id;

				const row = (
					<div
						className={cn(
							'group relative flex items-start gap-3.5 rounded-xl px-2 py-2.5',
							'transition-colors duration-150 ease-apple-out',
							eventId && 'hover:bg-white/[0.035]'
						)}
					>
						<div
							className={cn(
								'relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold',
								avatarStyle(activity.studentID || name)
							)}
						>
							{initials(first, last)}
							<span
								className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[2.5px] border-[#0b0c10]"
								style={{ background: meta.color }}
							/>
						</div>

						<div className="min-w-0 flex-1 pt-0.5">
							<div className="flex items-baseline justify-between gap-3">
								<p className="truncate text-[12.5px] font-medium text-white/80">{name}</p>
								<p className="numeric shrink-0 text-[11px] tabular-nums text-white/32">
									{isToday(new Date(stamp))
										? format(new Date(stamp), 'h:mm a')
										: format(new Date(stamp), 'MMM d')}
								</p>
							</div>
							<div className="mt-1 flex items-center justify-between gap-3">
								<p className="min-w-0 truncate text-[11.5px] text-white/32">
									{activity.event?.title ?? 'No event'}
									{activity.student?.course && (
										<span className="text-white/20"> · {activity.student.course}</span>
									)}
								</p>
								<span
									className="shrink-0 rounded-full px-2 py-[3px] text-[9.5px] font-semibold uppercase tracking-micro"
									style={{ color: meta.color, background: meta.bg }}
								>
									{meta.label}
								</span>
							</div>
						</div>

						{eventId && (
							<CaretRight className="mt-3 h-3 w-3 shrink-0 text-white/0 transition-[color,transform] duration-200 ease-apple-out group-hover:translate-x-0.5 group-hover:text-white/35" />
						)}
					</div>
				);

				const content = eventId ? (
					<Link
						to={`/admin/events/${eventId}`}
						className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b8def]/40"
					>
						{row}
					</Link>
				) : (
					row
				);

				return (
					<motion.li
						key={activity._id}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ type: 'spring', bounce: 0, duration: 0.4, delay: index * 0.04 }}
					>
						{content}
					</motion.li>
				);
			})}
		</ol>
	);
}
