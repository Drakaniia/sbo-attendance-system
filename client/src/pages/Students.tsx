import { useQuery } from '@tanstack/react-query';
import ImportStudentsButton from '../components/ImportStudentsButton';
import StudentsTable from '../components/StudentsTable';
import StudentFilterBar from '../components/StudentFilterBar';
import Header from '../components/ui/Header';
import LiveClock from '../components/LiveClock';
import Pagination from '../components/ui/Pagination';
import { QUERY_KEYS } from '../constants';
import { useStudentFilterStore } from '../store/students-filter';
import { fetchStudents } from '../api/student';
import { Warning, ArrowsClockwise, MagnifyingGlass, User } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Students() {
	const { getFilterValues, page, pageSize, setPage } = useStudentFilterStore((state) => state);
	const currentPage = page ?? 1;
	const currentPageSize = pageSize ?? 10;
	const { data, isLoading, error, refetch, isFetching } = useQuery({
		queryKey: [QUERY_KEYS.STUDENTS, getFilterValues()],
		queryFn: () => fetchStudents(getFilterValues(), currentPage, currentPageSize),
	});

	const students = data?.data;
	const hasStudents = !!students?.length;
	const totalPages = data?.totalPages ?? 1;

	const filters = getFilterValues();
	const hasActiveFilters =
		!!filters.search ||
		(filters.course ?? 'All') !== 'All' ||
		(filters.year ?? 'All') !== 'All' ||
		(filters.gender ?? 'All') !== 'All';

	return (
		<div className="flex flex-col gap-6 pb-8 -mx-5 -mt-5 px-5">
			{/* Sticky toolbar — translucent chrome, content scrolls beneath */}
			<header className="sticky -top-5 z-20 glass-heavy pt-5 pb-4 -mx-5 px-5">
				<div className="flex items-center justify-between gap-4">
					<div className="min-w-0">
						<Header className="!text-2xl !tracking-tight truncate">Students</Header>
						<p className="text-white/40 text-sm mt-1 truncate">
							{format(new Date(), 'EEEE, MMMM d, yyyy')}
							{data?.total != null && (
								<>
									{' '}
									· <span className="text-white/60 tabular-nums">{data.total}</span> students
								</>
							)}
						</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-white/60">
							<span className="relative flex w-2 h-2">
								<span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
								<span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
							</span>
							<LiveClock format="12" showSeconds className="tabular-nums text-white/60" />
						</div>
						<ImportStudentsButton />
					</div>
				</div>
			</header>

			{/* Filter bar */}
			<StudentFilterBar />

			{error ? (
				<ErrorState onRetry={refetch} isRetrying={isFetching} />
			) : !isLoading && !hasStudents ? (
				<EmptyState filtered={hasActiveFilters} />
			) : (
				<>
					<StudentsTable isLoading={isLoading} students={students} />
					{hasStudents && totalPages > 1 && (
						<Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
					)}
				</>
			)}
		</div>
	);
}

/* ── States ────────────────────────────────────────── */

type ErrorStateProps = {
	onRetry: () => void;
	isRetrying: boolean;
};

function ErrorState({ onRetry, isRetrying }: ErrorStateProps) {
	return (
		<div
			role="alert"
			className="glass rounded-2xl p-10 flex flex-col items-center gap-4 text-center border-red-500/20"
		>
			<div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/15">
				<Warning className="w-7 h-7 text-red-400" />
			</div>
			<div>
				<p className="text-white font-semibold text-lg">Couldn't load the student list</p>
				<p className="text-sm text-white/40 mt-1">
					The server may be unreachable right now. Give it another try.
				</p>
			</div>
			<button
				type="button"
				onClick={onRetry}
				disabled={isRetrying}
				className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white/80 text-sm font-medium px-4 py-2 transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97] disabled:opacity-50"
			>
				<ArrowsClockwise className={cn('w-4 h-4', isRetrying && 'motion-safe:animate-spin')} />
				{isRetrying ? 'Retrying…' : 'Try again'}
			</button>
		</div>
	);
}

type EmptyStateProps = {
	filtered: boolean;
};

function EmptyState({ filtered }: EmptyStateProps) {
	const { setCourse, setYear, setGender, setSearch } = useStudentFilterStore((state) => state);

	const clearFilters = () => {
		setCourse('All');
		setYear('All');
		setGender('All');
		setSearch('');
	};

	return (
		<div className="glass rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
			<div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/[0.04]">
				{filtered ? (
					<MagnifyingGlass className="w-7 h-7 text-white/40" />
				) : (
					<User className="w-7 h-7 text-white/40" />
				)}
			</div>
			<div>
				<p className="text-white font-semibold text-lg">
					{filtered ? 'No students match your filters' : 'No masterlist yet'}
				</p>
				<p className="text-sm text-white/40 max-w-md mt-1">
					{filtered
						? 'Try clearing the filters to see more students.'
						: 'Upload the masterlist CSV or Excel file with the Import button, or start scanning student IDs at an event — scanned students are added automatically.'}
				</p>
			</div>
			{filtered && (
				<button
					type="button"
					onClick={clearFilters}
					className="text-sm font-medium text-white/50 hover:text-white transition-colors"
				>
					Clear filters
				</button>
			)}
		</div>
	);
}
