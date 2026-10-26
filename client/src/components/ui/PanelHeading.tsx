import type { ReactNode } from 'react';

type PanelHeadingProps = {
	eyebrow: string;
	title: string;
	action?: ReactNode;
	className?: string;
};

/** The small, consistent masthead used inside every dashboard panel. */
export default function PanelHeading({ eyebrow, title, action, className }: PanelHeadingProps) {
	return (
		<div className={className ?? 'flex items-start justify-between gap-4'}>
			<div className="min-w-0">
				<p className="eyebrow">{eyebrow}</p>
				<h2 className="mt-2 text-[15.5px] font-semibold tracking-title text-[#f5f5f7]">{title}</h2>
			</div>
			{action}
		</div>
	);
}
