import { cn } from '../lib/utils';

type RailTooltipProps = {
	label: string;
	className?: string;
};

/**
 * Tooltip that materializes to the right of a collapsed sidebar rail item.
 * Rendered inside a `group` parent — appears on hover, slides in on a fast
 * ease-out, uses the modal material so it reads as a real surface arriving.
 */
export default function RailTooltip({ label, className }: RailTooltipProps) {
	return (
		<span
			role='tooltip'
			className={cn(
				'pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 origin-left whitespace-nowrap rounded-lg border border-white/[0.1] bg-[rgba(20,20,22,0.85)] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl backdrop-blur-xl transition-all duration-150 ease-apple-out scale-95 group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none',
				className
			)}
		>
			{label}
		</span>
	);
}
