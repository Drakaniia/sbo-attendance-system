import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { TimeType } from '../../types/event';

type SegmentedControlProps = {
	value: TimeType;
	onChange: (value: TimeType) => void;
};

export default function SegmentedControl({
	value,
	onChange,
}: SegmentedControlProps) {
	const options: TimeType[] = ['Time In', 'Time Out'];

	return (
		<div
			role='radiogroup'
			aria-label='Record type'
			className='relative flex p-1 rounded-full bg-white/[0.04] border border-white/[0.08] w-fit'
		>
			{options.map((option) => {
				const active = value === option;
				return (
					<button
						key={option}
						role='radio'
						aria-checked={active}
						onClick={() => onChange(option)}
						className={cn(
							'relative z-10 px-4 py-1.5 text-xs font-medium rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 ring-white/30',
							active
								? 'text-white'
								: 'text-white/50 hover:text-white/70'
						)}
					>
						{active && (
							<motion.span
								layoutId='segmented-thumb'
								className='absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.1]'
								transition={{
									type: 'spring',
									bounce: 0,
									duration: 0.35,
								}}
							/>
						)}
						<span className='relative'>{option}</span>
					</button>
				);
			})}
		</div>
	);
}
