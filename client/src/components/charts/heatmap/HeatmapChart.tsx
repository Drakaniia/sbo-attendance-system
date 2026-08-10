import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import type { HeatmapDailyEntry, HeatmapHourlyEntry } from '../../../api/reports';
import { HeatmapHeader } from './HeatmapHeader';
import { HourlyGrid } from './HourlyGrid';
import { DailyGrid } from './DailyGrid';
import { LegendBar } from './LegendBar';
import { SkeletonGrid } from './SkeletonGrid';
import { getTooltipLabel } from './color';

type HeatmapChartProps = {
	hourlyData: HeatmapHourlyEntry[];
	dailyData: HeatmapDailyEntry[];
	isLoading?: boolean;
};

type TooltipState = {
	label: string;
	x: number;
	y: number;
} | null;

export default function HeatmapChart({
	hourlyData,
	dailyData,
	isLoading = false,
}: HeatmapChartProps) {
	const reduceMotion = useReducedMotion();
	const [view, setView] = useState<'hourly' | 'daily'>('hourly');
	const [tooltip, setTooltip] = useState<TooltipState>(null);
	const gridRef = useRef<HTMLDivElement>(null);

	// Build lookup maps
	const hourlyMap = useMemo(() => {
		const m = new Map<number, number>();
		for (const entry of hourlyData) m.set(entry.hour, entry.count);
		return m;
	}, [hourlyData]);

	const dailyMap = useMemo(() => {
		const m = new Map<string, number>();
		for (const entry of dailyData) {
			m.set(`${entry.dayOfWeek}-${entry.hour}`, entry.count);
		}
		return m;
	}, [dailyData]);

	// Max counts for color scaling
	const hourlyMax = useMemo(
		() => hourlyData.reduce((max, e) => Math.max(max, e.count), 0),
		[hourlyData],
	);

	const dailyMax = useMemo(
		() => dailyData.reduce((max, e) => Math.max(max, e.count), 0),
		[dailyData],
	);

	const hasHourlyData = hourlyData.length > 0;
	const hasDailyData = dailyData.length > 0;
	const hasData = view === 'hourly' ? hasHourlyData : hasDailyData;

	// ── Tooltip handlers ────────────────────────────
	const handleCellHover = useCallback(
		(e: React.MouseEvent, label: string) => {
			if (!gridRef.current) return;
			const rect = gridRef.current.getBoundingClientRect();
			setTooltip({
				label,
				x: e.clientX - rect.left + 12,
				y: e.clientY - rect.top - 40,
			});
		},
		[],
	);

	const handleMouseLeave = useCallback(() => setTooltip(null), []);

	// ── Animate key for re-stagger on view change ──
	const animateKey = view;

	// ── Loading state ───────────────────────────────
	if (isLoading) {
		return (
			<div className="glass glass-hover rounded-2xl p-5">
				<HeatmapHeader view={view} onViewChange={setView} />
				<div className="flex items-start gap-4 mt-4">
					<div className="flex-1">
						<SkeletonGrid rows={view === 'hourly' ? 1 : 7} />
					</div>
					<LegendBar />
				</div>
			</div>
		);
	}

	// ── Empty state ─────────────────────────────────
	if (!hasData) {
		return (
			<div className="glass glass-hover rounded-2xl p-5">
				<HeatmapHeader view={view} onViewChange={setView} />
				<div className="flex items-center justify-center py-16 text-white/20 text-sm">
					No attendance data for this period
				</div>
			</div>
		);
	}

	return (
		<div className="glass glass-hover rounded-2xl p-5">
			<HeatmapHeader view={view} onViewChange={setView} />

			<div className="flex items-start gap-4 mt-4">
				{/* Grid */}
				<div ref={gridRef} className="relative flex-1">
					{view === 'hourly' ? (
						<HourlyGrid
							hourlyMap={hourlyMap}
							hourlyMax={hourlyMax}
							animateKey={animateKey}
							reduceMotion={reduceMotion ?? false}
							onCellHover={(e, hour, count) =>
								handleCellHover(e, getTooltipLabel('hourly', hour, count))
							}
							onMouseLeave={handleMouseLeave}
						/>
					) : (
						<DailyGrid
							dailyMap={dailyMap}
							dailyMax={dailyMax}
							animateKey={animateKey}
							reduceMotion={reduceMotion ?? false}
							onCellHover={(e, day, hour, count) =>
								handleCellHover(
									e,
									getTooltipLabel('daily', hour, count, day),
								)
							}
							onMouseLeave={handleMouseLeave}
						/>
					)}
				</div>

				{/* Legend */}
				<LegendBar />
			</div>

			{/* Tooltip */}
			<AnimatePresence>
				{tooltip && (
					<motion.div
						className="absolute z-50 pointer-events-none px-3 py-2 rounded-xl text-xs text-white font-medium"
						style={{
							left: tooltip.x,
							top: tooltip.y,
							background: 'rgba(30,30,30,0.95)',
							border: '1px solid rgba(255,255,255,0.1)',
							borderRadius: '12px',
							backdropFilter: 'blur(12px)',
							boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
						}}
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						transition={{ duration: 0.12 }}
					>
						{tooltip.label}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
