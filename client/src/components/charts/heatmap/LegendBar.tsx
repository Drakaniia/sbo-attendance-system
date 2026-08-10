import { CELL_GAP, CELL_SIZE } from './color';

export function LegendBar() {
	return (
		<div className="flex flex-col items-center gap-1 shrink-0">
			<span className="text-[10px] font-medium text-white/25 tracking-micro">Less</span>
			<div
				className="w-3 rounded-md"
				style={{
					height: 7 * (CELL_SIZE + CELL_GAP),
					background:
						'linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.4), rgba(99, 102, 241, 0.8), #312e81)',
					borderRadius: 6,
				}}
			/>
			<span className="text-[10px] font-medium text-white/25 tracking-micro">More</span>
		</div>
	);
}
