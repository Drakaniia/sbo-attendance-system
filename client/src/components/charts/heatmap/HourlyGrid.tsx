import { motion } from 'framer-motion';
import { CELL_GAP, CELL_SIZE, HOUR_LABELS, heatmapColor, getTooltipLabel } from './color';

export function HourlyGrid({
	hourlyMap,
	hourlyMax,
	animateKey,
	reduceMotion,
	onCellHover,
	onMouseLeave,
}: {
	hourlyMap: Map<number, number>;
	hourlyMax: number;
	animateKey: string;
	reduceMotion: boolean;
	onCellHover: (e: React.MouseEvent, hour: number, count: number) => void;
	onMouseLeave: () => void;
}) {
	return (
		<div className="overflow-x-auto" onMouseLeave={onMouseLeave}>
			{/* Hour labels */}
			<div
				className="grid mb-1"
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

			{/* Grid row */}
			<div
				className="grid"
				style={{
					gridTemplateColumns: `repeat(24, ${CELL_SIZE}px)`,
					gap: CELL_GAP,
				}}
			>
				{Array.from({ length: 24 }, (_, hour) => {
					const count = hourlyMap.get(hour) ?? 0;
					const color = heatmapColor(count, hourlyMax);
					const label = getTooltipLabel('hourly', hour, count);

					return (
						<motion.div
							key={`${animateKey}-${hour}`}
							className="rounded-[2px] cursor-crosshair transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.35] hover:z-10 hover:ring-1 hover:ring-indigo-400/60"
							style={{
								width: CELL_SIZE,
								height: CELL_SIZE,
								backgroundColor: color,
							}}
							initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{
								delay: reduceMotion ? 0 : hour * 0.008,
								duration: reduceMotion ? 0 : 0.25,
								ease: 'easeOut',
							}}
							onMouseEnter={(e) => onCellHover(e, hour, count)}
							title={label}
						/>
					);
				})}
			</div>
		</div>
	);
}
