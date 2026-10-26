import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

export type SegmentedOption<T extends string | number> = {
	value: T;
	label: string;
};

type SegmentedProps<T extends string | number> = {
	options: SegmentedOption<T>[];
	value: T;
	onChange: (value: T) => void;
	ariaLabel: string;
	className?: string;
};

/**
 * Apple segmented control: a recessed track, a raised thumb that springs
 * between labels. Interruptible — clicking mid-flight retargets the spring.
 */
export default function Segmented<T extends string | number>({
	options,
	value,
	onChange,
	ariaLabel,
	className,
}: SegmentedProps<T>) {
	const reduceMotion = useReducedMotion();
	const layoutId = useId();

	return (
		<div
			role="tablist"
			aria-label={ariaLabel}
			className={cn(
				'relative inline-flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.04] p-0.5',
				'[@media(hover:hover)]:hover:border-white/[0.09]',
				className
			)}
		>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={String(option.value)}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(option.value)}
						className={cn(
							'relative isolate rounded-full px-3 py-1.5 text-[11.5px] font-medium leading-none transition-colors duration-150 ease-apple-out',
							active ? 'text-white' : 'text-white/42 hover:text-white/75'
						)}
					>
						{active &&
							(reduceMotion ? (
								<span className="absolute inset-0 -z-10 rounded-full border border-white/[0.10] bg-white/[0.11] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]" />
							) : (
								<motion.span
									layoutId={layoutId}
									className="absolute inset-0 -z-10 rounded-full border border-white/[0.10] bg-white/[0.11] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
									transition={{ type: 'spring', bounce: 0.12, duration: 0.42 }}
								/>
							))}
						<span className="relative">{option.label}</span>
					</button>
				);
			})}
		</div>
	);
}
