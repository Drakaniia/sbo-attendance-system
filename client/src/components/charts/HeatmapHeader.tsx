import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function HeatmapHeader({
	view,
	onViewChange,
}: {
	view: 'hourly' | 'daily';
	onViewChange: (v: 'hourly' | 'daily') => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<p className="eyebrow">Rhythm</p>
				<h2 className="mt-2 text-[15.5px] font-semibold tracking-title text-[#f5f5f7]">
					Attendance heatmap
				</h2>
			</div>

			{/* iOS-style segmented control */}
			<div className="relative flex items-center rounded-full bg-white/[0.06] border border-white/[0.08] p-0.5">
				{/* Sliding pill indicator */}
				<motion.div
					className="absolute inset-y-0.5 rounded-full bg-[#3f7ae0] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
					layoutId="heatmap-toggle-pill"
					transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
					style={{
						left: view === 'hourly' ? '2px' : 'calc(50% + 2px)',
						width: 'calc(50% - 4px)',
					}}
				/>

				<button
					type="button"
					onClick={() => onViewChange('hourly')}
					className={cn(
						'relative z-10 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors duration-200',
						view === 'hourly' ? 'text-white' : 'text-white/38 hover:text-white/65'
					)}
				>
					By Hour
				</button>
				<button
					type="button"
					onClick={() => onViewChange('daily')}
					className={cn(
						'relative z-10 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors duration-200',
						view === 'daily' ? 'text-white' : 'text-white/38 hover:text-white/65'
					)}
				>
					By Day &amp; Hour
				</button>
			</div>
		</div>
	);
}
