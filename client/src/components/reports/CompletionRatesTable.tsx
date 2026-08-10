import { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CaretUp, CaretDown, CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import type { EventBreakdownEntry } from '../../api/reports';

type SortKey = 'title' | 'date' | 'checkIns' | 'checkOuts' | 'rate' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_THRESHOLDS = {
	HIGH: 80,
	MEDIUM: 50,
} as const;

function getCompletionStatus(rate: number) {
	if (rate >= STATUS_THRESHOLDS.HIGH) return 'high' as const;
	if (rate >= STATUS_THRESHOLDS.MEDIUM) return 'medium' as const;
	return 'low' as const;
}

const STATUS_META = {
	high: {
		label: 'High',
		icon: CheckCircle,
		className: 'text-emerald-400 bg-emerald-400/10',
	},
	medium: {
		label: 'Medium',
		icon: WarningCircle,
		className: 'text-amber-400 bg-amber-400/10',
	},
	low: {
		label: 'Low',
		icon: XCircle,
		className: 'text-red-400 bg-red-400/10',
	},
};

type Props = {
	data: EventBreakdownEntry[];
	isLoading?: boolean;
};

export default function CompletionRatesTable({ data, isLoading }: Props) {
	const reduceMotion = useReducedMotion();
	const [sortKey, setSortKey] = useState<SortKey>('rate');
	const [sortDir, setSortDir] = useState<SortDir>('desc');

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortKey(key);
			setSortDir('desc');
		}
	};

	const sorted = useMemo(() => {
		const dir = sortDir === 'asc' ? 1 : -1;
		return [...data].sort((a, b) => {
			switch (sortKey) {
				case 'title':
					return a.title.localeCompare(b.title) * dir;
				case 'date':
					return a.startTime.localeCompare(b.startTime) * dir;
				case 'checkIns':
					return (a.checkIns - b.checkIns) * dir;
				case 'checkOuts':
					return (a.checkOuts - b.checkOuts) * dir;
				case 'rate': {
					const rateA = a.checkIns > 0 ? (a.checkOuts / a.checkIns) * 100 : 0;
					const rateB = b.checkIns > 0 ? (b.checkOuts / b.checkIns) * 100 : 0;
					return (rateA - rateB) * dir;
				}
				case 'status': {
					const rateA = a.checkIns > 0 ? (a.checkOuts / a.checkIns) * 100 : 0;
					const rateB = b.checkIns > 0 ? (b.checkOuts / b.checkIns) * 100 : 0;
					return (rateA - rateB) * dir;
				}
				default:
					return 0;
			}
		});
	}, [data, sortKey, sortDir]);

	const SortIcon = ({ field }: { field: SortKey }) => {
		if (sortKey !== field) return null;
		return sortDir === 'asc' ? (
			<CaretUp className="w-3 h-3 inline-block ml-1" />
		) : (
			<CaretDown className="w-3 h-3 inline-block ml-1" />
		);
	};

	const Header = ({
		field,
		label,
		className = '',
	}: {
		field: SortKey;
		label: string;
		className?: string;
	}) => (
		<th
			className={cn(
				'px-3 py-3 text-xs font-medium text-white/30 uppercase tracking-wider cursor-pointer select-none hover:text-white/50 transition-colors',
				className
			)}
			onClick={() => handleSort(field)}
		>
			{label}
			<SortIcon field={field} />
		</th>
	);

	// ── Loading ────────────────────────────────────────
	if (isLoading) {
		return (
			<div className="glass glass-hover rounded-2xl p-5">
				<TableTitle />
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-white/[0.06]">
								{COLUMNS.map((col) => (
									<th
										key={col.field}
										className="px-3 py-3 text-xs font-medium text-white/20 uppercase tracking-wider"
									>
										{col.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{Array.from({ length: 5 }).map((_, i) => (
								<tr key={`skel-${i}`} className="border-b border-white/[0.03]">
									{Array.from({ length: 6 }).map((_, j) => (
										<td key={j} className="px-3 py-3">
											<div
												className="h-4 rounded bg-white/[0.04] animate-pulse"
												style={{
													animationDelay: `${i * 100}ms`,
													width: j === 0 ? '70%' : j === 1 ? '30%' : '50%',
												}}
											/>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	// ── Empty ──────────────────────────────────────────
	if (!data || data.length === 0) {
		return (
			<div className="glass glass-hover rounded-2xl p-5">
				<TableTitle />
				<div className="flex flex-col items-center justify-center py-12 text-white/20">
					<CheckCircle className="w-10 h-10 mb-2 opacity-30" />
					<p className="text-sm">No events with attendance data in this period</p>
				</div>
			</div>
		);
	}

	return (
		<div className="glass glass-hover rounded-2xl p-5">
			<TableTitle />
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-white/[0.06]">
							<Header field="title" label="Event" className="text-left" />
							<Header field="date" label="Date" className="text-left" />
							<Header field="checkIns" label="Check-ins" className="text-right" />
							<Header field="checkOuts" label="Check-outs" className="text-right" />
							<Header field="rate" label="Rate" className="text-right" />
							<Header field="status" label="Status" className="text-left" />
						</tr>
					</thead>
					<tbody>
						{sorted.map((entry, i) => {
							const rate =
								entry.checkIns > 0 ? Math.round((entry.checkOuts / entry.checkIns) * 100) : 0;
							const status = getCompletionStatus(rate);
							const meta = STATUS_META[status];
							const StatusIcon = meta.icon;

							return (
								<motion.tr
									key={entry.eventId}
									className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
									initial={
										reduceMotion
											? false
											: {
													opacity: 0,
													y: 6,
												}
									}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										delay: i * 0.04,
										duration: 0.3,
										ease: 'easeOut',
									}}
								>
									<td className="px-3 py-3 text-white/80 font-medium min-w-[160px]">
										{entry.title.length > 24 ? entry.title.slice(0, 22) + '…' : entry.title}
									</td>
									<td className="px-3 py-3 text-white/50 text-xs min-w-[90px]">
										{format(new Date(entry.startTime), 'MMM d, yyyy')}
									</td>
									<td className="px-3 py-3 text-right text-white/60 tabular-nums">
										{entry.checkIns}
									</td>
									<td className="px-3 py-3 text-right text-white/60 tabular-nums">
										{entry.checkOuts}
									</td>
									<td className="px-3 py-3 text-right tabular-nums font-medium">
										<span
											className={cn(
												status === 'high' && 'text-emerald-400',
												status === 'medium' && 'text-amber-400',
												status === 'low' && 'text-red-400'
											)}
										>
											{rate}%
										</span>
									</td>
									<td className="px-3 py-3">
										<span
											className={cn(
												'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium',
												meta.className
											)}
										>
											<StatusIcon className="w-3.5 h-3.5" />
											{meta.label}
										</span>
									</td>
								</motion.tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

const COLUMNS = [
	{ field: 'title' as SortKey, label: 'Event' },
	{ field: 'date' as SortKey, label: 'Date' },
	{ field: 'checkIns' as SortKey, label: 'Check-ins' },
	{ field: 'checkOuts' as SortKey, label: 'Check-outs' },
	{ field: 'rate' as SortKey, label: 'Rate' },
	{ field: 'status' as SortKey, label: 'Status' },
];

function TableTitle() {
	return (
		<div className="mb-4">
			<h3 className="text-base font-semibold text-white tracking-tight">Event Completion Rates</h3>
			<p className="text-xs text-white/30 mt-0.5">Check-in to check-out ratios per event</p>
		</div>
	);
}
