import { useQuery } from '@tanstack/react-query';
import ImportStudentsButton from '../components/ImportStudentsButton';
import StudentsTable from '../components/StudentsTable';
import StudentFilterBar from '../components/StudentFilterBar';
import PageHeader from '../components/ui/PageHeader';
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
		queryFn: ({ signal }) => fetchStudents(getFilterValues(), currentPage, currentPageSize, signal),
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
		<div className="flex flex-col gap-5 pb-4">
			<PageHeader
				eyebrow={
					<>
						<span>{format(new Date(), 'EEEE, MMMM d')}</span>
						<span className="h-[3px] w-[3px] rounded-full bg-white/20" />
						<span className="tabular-nums">{data?.total ?? 0} students</span>
					</>
				}
				title="Students"
				description="The masterlist behind every scan — search, filter, and keep it current."
				actions={<ImportStudentsButton />}
			/>

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
			className="panel flex flex-col items-center gap-4 px-6 py-14 text-center border-[#f07c9a]/20"
		>
			<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f07c9a]/[0.08]">
				<Warning className="h-5 w-5 text-[#ff9dae]" />
			</div>
			<div>
				<p className="text-[13px] font-medium text-white/70">Couldn't load the student list</p>
				<p className="mt-1 text-[11.5px] leading-relaxed text-white/32">
					The local database may be busy right now. Give it another try.
				</p>
			</div>
			<button
				type="button"
				onClick={onRetry}
				disabled={isRetrying}
				className="control disabled:opacity-50"
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
		<div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
			<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
				{filtered ? (
					<MagnifyingGlass className="h-5 w-5 text-white/25" />
				) : (
					<User className="h-5 w-5 text-white/25" />
				)}
			</div>
			<div>
				<p className="text-[13px] font-medium text-white/60">
					{filtered ? 'No students match your filters' : 'No masterlist yet'}
				</p>
				<p className="mx-auto mt-1 max-w-md text-[11.5px] leading-relaxed text-white/30">
					{filtered
						? 'Try clearing the filters to see more students.'
						: 'Upload the masterlist CSV or Excel file with the Import button, or start scanning student IDs at an event — scanned students are added automatically.'}
				</p>
			</div>
			{filtered && (
				<button
					type="button"
					onClick={clearFilters}
					className="text-[12px] font-medium text-[#9bbcff] transition-colors hover:text-white"
				>
					Clear filters
				</button>
			)}
		</div>
	);
}
