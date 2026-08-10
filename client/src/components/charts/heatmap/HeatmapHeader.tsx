import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';

export function HeatmapHeader({
	view,
	onViewChange,
}: {
	view: 'hourly' | 'daily';
	onViewChange: (v: 'hourly' | 'daily') => void;
}) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h3 className="text-base font-semibold text-white tracking-tight">
					Attendance Heatmap
				</h3>
				<p className="text-xs text-white/30 mt-0.5">
					When students check in and out
				</p>
			</div>

			{/* iOS-style segmented control */}
			<div className="relative flex items-center rounded-full bg-white/[0.06] border border-white/[0.08] p-0.5">
				{/* Sliding pill indicator */}
				<motion.div
					className="absolute inset-y-0.5 rounded-full bg-indigo-500"
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
						'relative z-10 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200',
						view === 'hourly'
							? 'text-white'
							: 'text-white/40 hover:text-white/60',
					)}
				>
					By Hour
				</button>
				<button
					type="button"
					onClick={() => onViewChange('daily')}
					className={cn(
						'relative z-10 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200',
						view === 'daily'
							? 'text-white'
							: 'text-white/40 hover:text-white/60',
					)}
				>
					By Day &amp; Hour
				</button>
			</div>
		</div>
	);
}
