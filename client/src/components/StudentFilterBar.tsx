import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { QUERY_KEYS } from '../constants';
import { useStudentFilterStore, type StudentFilterValues } from '../store/students-filter';
import { fetchAvailableCourses, fetchStudents } from '../api/student';
import { queryClient } from '../main';

/* ── Generic spring-anchored dropdown menu ─────────── */

type FilterDropdownProps = {
	label: string;
	value: string;
	options: string[];
	onChange: (value: string) => void;
	onOpen?: () => void;
};

function FilterDropdown({ label, value, options, onChange, onOpen }: FilterDropdownProps) {
	const reduceMotion = useReducedMotion();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		const onClickOutside = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('mousedown', onClickOutside);
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('mousedown', onClickOutside);
		};
	}, [open]);

	const isFiltered = value !== 'All';

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				onClick={() => {
					setOpen((o) => !o);
					if (!open) onOpen?.();
				}}
				aria-haspopup="listbox"
				aria-expanded={open}
				className={cn(
					'flex h-9 items-center gap-2 rounded-full border px-3 text-[11.5px] font-medium transition-[background-color,border-color,transform] duration-150 ease-apple-out active:scale-[0.97]',
					isFiltered
						? 'border-[#5b8def]/30 bg-[#5b8def]/[0.10] text-[#cfe0ff]'
						: 'border-white/[0.07] bg-white/[0.03] text-white/50 hover:bg-white/[0.055] hover:text-white/78'
				)}
			>
				<span>{isFiltered ? `${label}: ${value}` : label}</span>
				<CaretDown
					className={cn(
						'w-3.5 h-3.5 text-white/40 transition-transform duration-200',
						open && 'rotate-180'
					)}
				/>
			</button>

			<AnimatePresence>
				{open && (
					<motion.ul
						role="listbox"
						aria-label={label}
						className="absolute left-0 top-[calc(100%+8px)] z-30 w-56 glass-modal rounded-2xl p-1.5 max-h-64 overflow-y-auto origin-top"
						initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6 }}
						animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
						exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6 }}
						transition={
							reduceMotion ? { duration: 0.1 } : { type: 'spring', bounce: 0, duration: 0.3 }
						}
					>
						{options.map((option) => {
							const active = option === value;
							return (
								<li key={option}>
									<button
										type="button"
										role="option"
										aria-selected={active}
										onClick={() => {
											onChange(option);
											setOpen(false);
										}}
										className={cn(
											'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors',
											active
												? 'text-white bg-white/[0.06]'
												: 'text-white/60 hover:text-white hover:bg-white/[0.04]'
										)}
									>
										{option}
										{active && <Check className="h-4 w-4 text-[#9bbcff]" weight="bold" />}
									</button>
								</li>
							);
						})}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ── Filter bar ────────────────────────────────────── */

export default function StudentFilterBar() {
	const {
		search,
		course,
		year,
		gender,
		page,
		pageSize,
		setSearch,
		setCourse,
		setYear,
		setGender,
		getFilterValues,
	} = useStudentFilterStore((state) => state);

	const { data: courses } = useQuery({
		queryKey: [QUERY_KEYS.STUDENT_COURSES],
		queryFn: ({ signal }) => fetchAvailableCourses(signal),
	});

	const prefetch = (filters: StudentFilterValues) => {
		const data = queryClient.getQueryData([QUERY_KEYS.STUDENTS, filters]);
		if (data) return;
		queryClient.prefetchQuery({
			queryKey: [QUERY_KEYS.STUDENTS, filters],
			queryFn: () => fetchStudents(filters, page, pageSize),
		});
	};

	const prefetchCourse = () =>
		courses?.forEach((c) => prefetch({ ...getFilterValues(), course: c }));
	const prefetchYear = () =>
		['1', '2', '3', '4'].forEach((y) =>
			prefetch({ ...getFilterValues(), year: y as StudentFilterValues['year'] })
		);
	const prefetchGender = () =>
		(['M', 'F'] as const).forEach((g) => prefetch({ ...getFilterValues(), gender: g }));

	const hasActiveFilters =
		!!search ||
		(course ?? 'All') !== 'All' ||
		(year ?? 'All') !== 'All' ||
		(gender ?? 'All') !== 'All';

	const clearFilters = () => {
		setSearch('');
		setCourse('All');
		setYear('All');
		setGender('All');
	};

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			{/* Search */}
			<div className="relative min-w-[220px] flex-1">
				<MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
				<input
					type="search"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or student ID…"
					className="h-10 w-full rounded-full border border-white/[0.07] bg-white/[0.03] pl-10 pr-9 text-[12.5px] text-white/85 outline-none transition-[border-color,background-color] duration-200 placeholder:text-white/26 focus:border-white/[0.14] focus:bg-white/[0.045] [&::-webkit-search-cancel-button]:hidden"
				/>
				{search && (
					<button
						type="button"
						onClick={() => setSearch('')}
						aria-label="Clear search"
						className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors active:scale-90"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{/* Dropdowns */}
			<div className="flex flex-wrap items-center gap-2">
				<FilterDropdown
					label="Course"
					value={course ?? 'All'}
					options={courses ? ['All', ...courses] : ['All']}
					onChange={(v) => setCourse(v)}
					onOpen={prefetchCourse}
				/>
				<FilterDropdown
					label="Year"
					value={year ?? 'All'}
					options={['All', '1', '2', '3', '4']}
					onChange={(v) => setYear(v as StudentFilterValues['year'])}
					onOpen={prefetchYear}
				/>
				<FilterDropdown
					label="Gender"
					value={gender ?? 'All'}
					options={['All', 'M', 'F']}
					onChange={(v) => setGender(v as StudentFilterValues['gender'])}
					onOpen={prefetchGender}
				/>
				{hasActiveFilters && (
					<button
						type="button"
						onClick={clearFilters}
						className="h-9 rounded-full px-3 text-[11.5px] font-medium text-white/42 transition-colors hover:bg-white/[0.055] hover:text-white/80"
					>
						Clear
					</button>
				)}
			</div>
		</div>
	);
}
