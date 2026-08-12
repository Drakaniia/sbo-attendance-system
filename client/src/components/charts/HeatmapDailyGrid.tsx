import { motion } from 'framer-motion';
import {
	CELL_GAP,
	CELL_SIZE,
	DAY_LABELS,
	HOUR_LABELS,
	heatmapColor,
	getTooltipLabel,
} from './heatmap-color';

export function DailyGrid({
	dailyMap,
	dailyMax,
	animateKey,
	reduceMotion,
	onCellHover,
	onMouseLeave,
}: {
	dailyMap: Map<string, number>;
	dailyMax: number;
	animateKey: string;
	reduceMotion: boolean;
	onCellHover: (e: React.MouseEvent, day: number, hour: number, count: number) => void;
	onMouseLeave: () => void;
}) {
	return (
		<div className="overflow-x-auto" onMouseLeave={onMouseLeave}>
			{/* Hour labels (above grid, offset by day label column) */}
			<div
				className="grid mb-1 ml-10"
				style={{
					gridTemplateColumns: `repeat(24, ${CELL_SIZE}px)`,
					gap: CELL_GAP,
				}}
			>
				{HOUR_LABELS.map((label) => (
					<div
						key={label}
						className="text-[10px] font-medium text-white/30 tracking-micro text-center"
						style={{ width: CELL_SIZE }}
					>
						{label}
					</div>
				))}
			</div>

			{/* Rows */}
			{DAY_LABELS.map((dayLabel, dayIdx) => (
				<div key={dayLabel} className="flex items-center">
					{/* Day label */}
					<div className="text-[10px] font-medium text-white/30 tracking-micro w-10 shrink-0 text-right pr-2">
						{dayLabel}
					</div>

					{/* Grid row */}
					<div
						className="grid"
						style={{
							gridTemplateColumns: `repeat(24, ${CELL_SIZE}px)`,
							gap: CELL_GAP,
						}}
					>
						{Array.from({ length: 24 }, (_, hour) => {
							const count = dailyMap.get(`${dayIdx}-${hour}`) ?? 0;
							const color = heatmapColor(count, dailyMax);
							const label = getTooltipLabel('daily', hour, count, dayIdx);

							return (
								<motion.div
									key={`${animateKey}-${dayIdx}-${hour}`}
									className="rounded-[2px] cursor-crosshair transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.35] hover:z-10 hover:ring-1 hover:ring-indigo-400/60"
									style={{
										width: CELL_SIZE,
										height: CELL_SIZE,
										backgroundColor: color,
									}}
									initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{
										delay: reduceMotion ? 0 : (dayIdx * 24 + hour) * 0.0025,
										duration: reduceMotion ? 0 : 0.25,
										ease: 'easeOut',
									}}
									onMouseEnter={(e) => onCellHover(e, dayIdx, hour, count)}
									title={label}
								/>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
