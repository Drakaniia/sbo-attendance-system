import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import LiveClock from '../LiveClock';

type PageHeaderProps = {
	/** Small uppercase line above the title — the date, a section, or context. */
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	/** Optional back affordance rendered to the left of the title. */
	back?: ReactNode;
	/** Primary controls, right-aligned. */
	actions?: ReactNode;
	/** Show the live clock pill on the right. Default: true */
	live?: boolean;
	/** Extra content under the title row (e.g. a filter bar). */
	children?: ReactNode;
	className?: string;
};

/**
 * The single masthead for every screen. Sits in the scroll container, sticks
 * to the top with a heavier material, and keeps the page title and controls
 * in one predictable place. Content scrolls beneath the soft lower edge.
 */
export default function PageHeader({
	eyebrow,
	title,
	description,
	back,
	actions,
	live = true,
	children,
	className,
}: PageHeaderProps) {
	return (
		<header
			className={cn(
				'sticky top-0 z-30 -mx-6 -mt-6 px-6 pb-5 pt-6 lg:-mx-10 lg:px-10',
				'bg-[#08090b]/[0.72] backdrop-blur-2xl backdrop-saturate-150',
				className
			)}
		>
			<div className="mx-auto flex w-full max-w-[1460px] flex-wrap items-end justify-between gap-x-8 gap-y-4">
				<div className="flex min-w-0 items-start gap-2.5">
					{back && <div className="shrink-0 pt-0.5">{back}</div>}
					<div className="min-w-0">
						{eyebrow && (
							<div className="eyebrow flex items-center gap-2">
								{typeof eyebrow === 'string' ? <span>{eyebrow}</span> : eyebrow}
							</div>
						)}
						<h1 className="mt-2.5 truncate text-[28px] font-semibold leading-[1.06] tracking-display text-[#f5f5f7] sm:text-[30px]">
							{title}
						</h1>
						{description && (
							<p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-white/40">
								{description}
							</p>
						)}
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2 pb-1">
					{actions}
					{live && (
						<div
							className="hidden h-8 items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 sm:flex"
							aria-label="Live clock"
						>
							<span className="relative flex h-1.5 w-1.5">
								<span className="absolute inline-flex h-full w-full rounded-full bg-[#33d6a6] opacity-60 motion-safe:animate-ping" />
								<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#33d6a6]" />
							</span>
							<LiveClock
								format="12"
								showSeconds
								className="numeric text-[11.5px] font-medium text-white/55"
							/>
						</div>
					)}
				</div>
			</div>

			{children && <div className="mx-auto mt-4 w-full max-w-[1460px]">{children}</div>}

			{/* Soft lower edge — a fade, not a rule */}
			<div
				className="pointer-events-none absolute inset-x-0 bottom-0 h-5 translate-y-full"
				style={{
					background: 'linear-gradient(to bottom, rgba(8,9,11,0.5), transparent)',
					maskImage: 'linear-gradient(to bottom, black, transparent)',
				}}
			/>
			<div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent lg:inset-x-10" />
		</header>
	);
}
