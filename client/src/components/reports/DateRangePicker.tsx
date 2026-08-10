import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Calendar, CaretDown, Check } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { format, subDays, startOfMonth, subMonths, endOfMonth } from 'date-fns';

// ── Types ───────────────────────────────────────────────────────────────

export type DateRange =
	| { preset: 'all' }
	| { preset: 'custom'; startDate: string; endDate: string }
	| {
			preset: 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth';
			startDate: string;
			endDate: string;
	  };

type PresetOption = {
	key: DateRange['preset'];
	label: string;
	compute: () => { startDate: string; endDate: string } | null;
};

// ── Helpers ─────────────────────────────────────────────────────────────

const toISODate = (d: Date): string => format(d, 'yyyy-MM-dd');

// ── Component ───────────────────────────────────────────────────────────

type DateRangePickerProps = {
	value: DateRange;
	onChange: (range: DateRange) => void;
	className?: string;
};

export default function DateRangePicker({
	value,
	onChange,
	className,
}: DateRangePickerProps) {
	const reduceMotion = useReducedMotion();
	const [open, setOpen] = useState(false);
	const [showCustom, setShowCustom] = useState(false);
	const [customStart, setCustomStart] = useState('');
	const [customEnd, setCustomEnd] = useState('');
	const rootRef = useRef<HTMLDivElement>(null);

	// ── Build preset options ─────────────────────────
	const presets = useMemo<PresetOption[]>(() => {
		const today = new Date();
		return [
			{
				key: 'today',
				label: 'Today',
				compute: () => ({
					startDate: toISODate(today),
					endDate: toISODate(today),
				}),
			},
			{
				key: 'last7',
				label: 'Last 7 days',
				compute: () => ({
					startDate: toISODate(subDays(today, 6)),
					endDate: toISODate(today),
				}),
			},
			{
				key: 'last30',
				label: 'Last 30 days',
				compute: () => ({
					startDate: toISODate(subDays(today, 29)),
					endDate: toISODate(today),
				}),
			},
			{
				key: 'thisMonth',
				label: 'This month',
				compute: () => ({
					startDate: toISODate(startOfMonth(today)),
					endDate: toISODate(today),
				}),
			},
			{
				key: 'lastMonth',
				label: 'Last month',
				compute: () => {
					const last = subMonths(today, 1);
					return {
						startDate: toISODate(startOfMonth(last)),
						endDate: toISODate(endOfMonth(last)),
					};
				},
			},		];
	}, []);

	// ── Close on Escape / outside click ──────────────
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setOpen(false);
				setShowCustom(false);
			}
		};
		const onClickOutside = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setOpen(false);
				setShowCustom(false);
			}
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('mousedown', onClickOutside);
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('mousedown', onClickOutside);
		};
	}, [open]);

	// ── Handlers ─────────────────────────────────────
	const handleSelect = useCallback(
		(preset: PresetOption) => {
			const computed = preset.compute();
			if (computed) {
				onChange({ preset: preset.key, ...computed } as DateRange);
			}
			setOpen(false);
			setShowCustom(false);
		},
		[onChange]
	);

	const handleAllTime = useCallback(() => {
		onChange({ preset: 'all' });
		setOpen(false);
		setShowCustom(false);
	}, [onChange]);

	const handleCustomApply = useCallback(() => {
		if (customStart && customEnd) {
			onChange({ preset: 'custom', startDate: customStart, endDate: customEnd });
			setOpen(false);
			setShowCustom(false);
		}
	}, [customStart, customEnd, onChange]);

	// ── Display label ────────────────────────────────
	const displayLabel = useMemo(() => {
		if (value.preset === 'all') return 'All time';
		if (value.preset === 'custom' && 'startDate' in value) {
			return `${value.startDate} – ${value.endDate}`;
		}
		const found = presets.find((p) => p.key === value.preset);
		return found?.label ?? 'Select date range';
	}, [value, presets]);

	const isActive = value.preset !== 'all';

	// ── Render ───────────────────────────────────────
	return (
		<div ref={rootRef} className={cn('relative', className)}>
			<button
				type='button'
				onClick={() => setOpen((o) => !o)}
				aria-haspopup='listbox'
				aria-expanded={open}
				className={cn(
					'flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm transition-[background-color,border-color,transform] duration-150 ease-apple-out active:scale-[0.97]',
					isActive
						? 'border-indigo-400/30 bg-indigo-400/[0.08] text-white'
						: 'border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.06] hover:text-white/80'
				)}
			>
				<Calendar className='w-4 h-4 text-white/40' />
				<span className='max-w-[180px] truncate'>{displayLabel}</span>
				<CaretDown
					className={cn(
						'w-3.5 h-3.5 text-white/40 transition-transform duration-200',
						open && 'rotate-180'
					)}
				/>
			</button>

			<AnimatePresence>
				{open && (
					<motion.div
						className='absolute right-0 top-[calc(100%+8px)] z-30 w-64 glass-modal rounded-2xl p-1.5 origin-top-right'
						initial={
							reduceMotion
								? { opacity: 0 }
								: { opacity: 0, scale: 0.95, y: -6 }
						}
						animate={
							reduceMotion
								? { opacity: 1 }
								: { opacity: 1, scale: 1, y: 0 }
						}
						exit={
							reduceMotion
								? { opacity: 0 }
								: { opacity: 0, scale: 0.95, y: -6 }
						}
						transition={
							reduceMotion
								? { duration: 0.1 }
								: { type: 'spring', bounce: 0, duration: 0.3 }
						}
					>
						{!showCustom ? (
							<>
								<div className='max-h-64 overflow-y-auto'>
									{presets.map((preset) => {
										const active = value.preset === preset.key;
										return (
											<button
												key={preset.key}
												type='button'
												onClick={() => handleSelect(preset)}
												className={cn(
													'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors',
													active
														? 'text-white bg-white/[0.06]'
														: 'text-white/60 hover:text-white hover:bg-white/[0.04]'
												)}
											>
												{preset.label}
												{active && (
													<Check className='w-4 h-4 text-indigo-400' />
												)}
											</button>
										);
									})}

									{/* Divider */}
									<div className='my-1 border-t border-white/[0.06]' />

									{/* All time */}
									<button
										type='button'
										onClick={handleAllTime}
										className={cn(
											'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors',
											value.preset === 'all'
												? 'text-white bg-white/[0.06]'
												: 'text-white/60 hover:text-white hover:bg-white/[0.04]'
										)}
									>
										All time
										{value.preset === 'all' && (
											<Check className='w-4 h-4 text-indigo-400' />
										)}
									</button>

									{/* Custom trigger */}
									<button
										type='button'
										onClick={() => setShowCustom(true)}
										className={cn(
											'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors',
											value.preset === 'custom'
												? 'text-white bg-white/[0.06]'
												: 'text-white/60 hover:text-white hover:bg-white/[0.04]'
										)}
									>
										Custom…
										{value.preset === 'custom' && (
											<Check className='w-4 h-4 text-indigo-400' />
										)}
									</button>
								</div>
							</>
						) : (
							/* Custom date range sub-panel */
							<div className='p-2'>
								<div className='flex items-center justify-between mb-3'>
									<button
										type='button'
										onClick={() => setShowCustom(false)}
										className='text-xs text-white/40 hover:text-white/70 transition-colors'
									>
										← Back
									</button>
									<span className='text-xs font-medium text-white/50'>
										Custom range
									</span>
									<div className='w-8' />
								</div>

								<div className='flex flex-col gap-2.5 mb-3'>
									<label className='flex flex-col gap-1'>
										<span className='text-[10px] text-white/30 uppercase tracking-micro'>
											Start date
										</span>
										<input
											type='date'
											value={customStart}
											onChange={(e) => setCustomStart(e.target.value)}
											className='w-full rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none transition-[border-color,background-color] duration-200 focus:border-indigo-400/40 focus:bg-white/[0.1] [color-scheme:dark]'
										/>
									</label>
									<label className='flex flex-col gap-1'>
										<span className='text-[10px] text-white/30 uppercase tracking-micro'>
											End date
										</span>
										<input
											type='date'
											value={customEnd}
											onChange={(e) => setCustomEnd(e.target.value)}
											className='w-full rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none transition-[border-color,background-color] duration-200 focus:border-indigo-400/40 focus:bg-white/[0.1] [color-scheme:dark]'
										/>
									</label>
								</div>

								<div className='flex items-center justify-end gap-2'>
									<button
										type='button'
										onClick={() => setShowCustom(false)}
										className='px-3 py-1.5 rounded-full text-xs font-medium text-white/40 hover:text-white/70 transition-colors'
									>
										Cancel
									</button>
									<button
										type='button'
										onClick={handleCustomApply}
										disabled={!customStart || !customEnd}
										className='px-3 py-1.5 rounded-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/[0.08] disabled:text-white/30 text-white text-xs font-semibold transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97] disabled:active:scale-100'
									>
										Apply
									</button>
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
