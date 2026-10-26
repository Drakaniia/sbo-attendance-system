import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

export type MetricItem = {
	label: string;
	value: number | string;
	icon?: React.ElementType;
	/** Small supporting line under the value. */
	hint?: ReactNode;
	/** Optional micro-visualisation, rendered at the right edge. */
	spark?: ReactNode;
	/** Tint for the icon. */
	accent?: string;
};

type MetricStripProps = {
	items: MetricItem[];
	className?: string;
};

function MetricCell({ item, index }: { item: MetricItem; index: number }) {
	const reduceMotion = useReducedMotion();
	const numeric = typeof item.value === 'number';
	const animated = useAnimatedNumber(numeric ? (item.value as number) : 0);
	const Icon = item.icon;

	return (
		<motion.div
			initial={reduceMotion ? false : { opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={
				reduceMotion
					? { duration: 0 }
					: { type: 'spring', bounce: 0, duration: 0.5, delay: 0.06 * index }
			}
			className={cn(
				'relative min-w-0 px-5 py-5 sm:px-6',
				index % 2 === 1 && 'border-l border-white/[0.05]',
				index >= 2 && 'border-t border-white/[0.05] lg:border-t-0',
				index >= 1 && 'lg:border-l lg:border-white/[0.05]',
				index === 2 && 'max-lg:border-l-0',
				// Odd item count: the final cell spans the mobile row.
				index === 4 && 'max-lg:col-span-2 max-lg:border-l-0'
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<p className="eyebrow truncate">{item.label}</p>
				{Icon && (
					<Icon
						className="mt-px h-3.5 w-3.5 shrink-0"
						style={{ color: item.accent ?? 'rgba(235,235,245,0.28)' }}
						strokeWidth={2.2}
					/>
				)}
			</div>

			<div className="mt-3.5 flex items-end justify-between gap-4">
				<p className="numeric text-[28px] font-semibold leading-none tracking-display text-[#f5f5f7]">
					{numeric ? animated.toLocaleString() : item.value}
				</p>
				{item.spark && <div className="h-7 w-[72px] shrink-0 pb-0.5 opacity-90">{item.spark}</div>}
			</div>

			{item.hint && <p className="mt-2 text-[11.5px] leading-tight text-white/34">{item.hint}</p>}
		</motion.div>
	);
}

/** A single panel divided into equal metric cells — no five disconnected cards. */
export default function MetricStrip({ items, className }: MetricStripProps) {
	return (
		<section
			aria-label="Key metrics"
			className={cn('panel grid grid-cols-2 overflow-hidden lg:grid-cols-4', className)}
		>
			{items.map((item, index) => (
				<MetricCell key={item.label} item={item} index={index} />
			))}
		</section>
	);
}
