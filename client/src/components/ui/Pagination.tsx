import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

type PaginationProps = {
	page: number;
	totalPages: number;
	onChange: (page: number) => void;
	className?: string;
};

/** Pages to render with ellipsis windows around the current page. */
function pageWindow(page: number, totalPages: number): (number | '…')[] {
	const pages: (number | '…')[] = [];
	const start = Math.max(1, page - 2);
	const end = Math.min(totalPages, page + 2);

	if (start > 1) {
		pages.push(1);
		if (start > 2) pages.push('…');
	}
	for (let i = start; i <= end; i++) pages.push(i);
	if (end < totalPages) {
		if (end < totalPages - 1) pages.push('…');
		pages.push(totalPages);
	}
	return pages;
}

/**
 * Apple-style pager — circular current-page pill, spring press feedback,
 * ellipsis windowing, and proper aria-current/nav semantics.
 */
export default function Pagination({
	page,
	totalPages,
	onChange,
	className,
}: PaginationProps) {
	return (
		<nav
			aria-label='Pagination'
			className={cn('flex items-center justify-center gap-1', className)}
		>
			<button
				type='button'
				onClick={() => onChange(page - 1)}
				disabled={page <= 1}
				aria-label='Previous page'
				className='p-2 rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed'
			>
				<ChevronLeft className='w-4 h-4' />
			</button>

			{pageWindow(page, totalPages).map((item, i) =>
				item === '…' ? (
					<span
						key={`ellipsis-${i}`}
						className='px-1.5 text-white/30 select-none'
					>
						…
					</span>
				) : (
					<button
						key={item}
						type='button'
						onClick={() => onChange(item)}
						aria-current={item === page ? 'page' : undefined}
						className={cn(
							'min-w-9 h-9 px-2.5 rounded-full text-sm font-medium transition-[background-color,color,transform] duration-150 ease-apple-out active:scale-90',
							item === page
								? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
								: 'text-white/50 hover:text-white hover:bg-white/[0.06]'
						)}
					>
						{item}
					</button>
				)
			)}

			<button
				type='button'
				onClick={() => onChange(page + 1)}
				disabled={page >= totalPages}
				aria-label='Next page'
				className='p-2 rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed'
			>
				<ChevronRight className='w-4 h-4' />
			</button>
		</nav>
	);
}
