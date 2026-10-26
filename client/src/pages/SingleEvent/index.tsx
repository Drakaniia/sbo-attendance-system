import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay } from 'date-fns';
import { QUERY_KEYS } from '../../constants';
import { fetchSingleEvent } from '../../api/event';
import { CaretLeft, Check, DownloadSimple, Scan, WarningCircle } from '@phosphor-icons/react';
import LiveClock from '../../components/LiveClock';
import { useEffect, useRef, useState } from 'react';
import { useNotification } from '../../hooks/useNotification';
import {
	exportEventExcel,
	fetchRecentlyRecordedAttendances,
	recordTimeIn,
	recordTimeOut,
} from '../../api/attendance';
import { queryClient } from '../../main';
import AttendanceTable from '../../components/AttendanceTable';
import Pagination from '../../components/ui/Pagination';
import EventAttendanceSummary from '../../components/EventAttendanceSummary';
import { cn } from '../../lib/utils';
import { useReducedMotion } from 'framer-motion';
import EventStatusPill from '../../components/EventStatusPill';
import PageHeader from '../../components/ui/PageHeader';
import ScanFeedbackOverlay from './ScanFeedbackOverlay';
import SegmentedControl from './SegmentedControl';
import type { ScanFeedback, TimeType } from '../../types/event';

const STUDENT_ID_LENGTH = 10;
const SUCCESS_FLASH_MS = 700;
const ERROR_OVERLAY_MS = 1600;
const DUPLICATE_OVERLAY_MS = 2000;

// Server error codes for a student who has already been recorded for this
// event — a soft warning, not a failure.
const DUPLICATE_ERROR_CODES = new Set(['AlreadyCheckedIn', 'AlreadyCheckedOut']);

export default function SingleEvent() {
	const navigate = useNavigate();
	const studentIDInputRef = useRef<HTMLInputElement>(null);
	// Synchronous guard — state updates are async, this ref is not
	const isSubmittingRef = useRef(false);
	const feedbackTimerRef = useRef<number | null>(null);
	const notification = useNotification();
	const { eventID } = useParams();
	const [timeType, setTimeType] = useState<TimeType>('Time In');
	const [studentID, setStudentID] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
	const [page, setPage] = useState(1);
	const reduceMotion = useReducedMotion();

	const {
		data: event,
		isLoading,
		error,
	} = useQuery({
		queryKey: [QUERY_KEYS.EVENTS, eventID],
		queryFn: () => fetchSingleEvent(eventID ?? ''),
	});

	const {
		data: attendancesData,
		isLoading: isLoadingAttendances,
		error: errorAttendances,
	} = useQuery({
		queryKey: [QUERY_KEYS.ATTENDANCES, eventID, page],
		queryFn: () => fetchRecentlyRecordedAttendances(eventID ?? '', page, 10),
	});

	const attendances = attendancesData?.data;
	const attendanceTotal = attendancesData?.total;
	const attendanceTotalPages = attendancesData?.totalPages ?? 1;

	const clearInput = () => {
		setStudentID('');
	};

	// Re-focus the input whenever `studentID` is cleared (after attendance recording)
	// and whenever `isSubmitting` transitions back to false.
	// We use a layout effect so focus lands before the browser paints.
	useEffect(() => {
		if (studentID === '' && !isSubmitting) {
			// Use rAF to ensure React has committed the DOM before focusing
			const frame = requestAnimationFrame(() => {
				studentIDInputRef.current?.focus();
			});
			return () => cancelAnimationFrame(frame);
		}
	}, [studentID, isSubmitting]);

	// Always-on focus guard — no matter what, the input is always active.
	// Barcode scanners emit raw keystrokes into whatever element has focus,
	// so we must never let the input lose focus while this page is mounted.
	const onBlur = () => {
		// Defer so the browser has time to assign focus to the clicked element,
		// then steal it back unconditionally.
		setTimeout(() => {
			studentIDInputRef.current?.focus();
		}, 0);
	};

	// Clean up pending feedback timers on unmount
	useEffect(() => {
		return () => {
			if (feedbackTimerRef.current) {
				window.clearTimeout(feedbackTimerRef.current);
			}
		};
	}, []);

	const showFeedback = (
		type: ScanFeedback['type'],
		message: string,
		id: string,
		duration: number
	) => {
		setFeedback({ type, message, studentID: id });
		if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
		feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), duration);
	};

	const submitAttendance = async (id: string) => {
		// Double-submit guard — the 10-digit onChange and the scanner's trailing
		// Enter can both fire for the same scan.
		if (isSubmittingRef.current) return;
		// Accept scans even when the ID is shorter than the full 10-digit
		// length — the operator confirms with Enter. Only reject an empty field.
		if (!id.trim()) return;

		isSubmittingRef.current = true;
		setIsSubmitting(true);

		try {
			if (timeType === 'Time In') {
				await recordTimeIn(eventID ?? '', id);
			} else {
				await recordTimeOut(eventID ?? '', id);
			}

			notification({
				title: 'Attendance Recorded Successfully',
				icon: <Check />,
				color: 'teal',
			});
			// Green flash on the input
			showFeedback('success', 'Attendance Recorded Successfully', id, SUCCESS_FLASH_MS);

			await queryClient.invalidateQueries({
				queryKey: [QUERY_KEYS.ATTENDANCES, eventID],
			});
			await queryClient.invalidateQueries({
				queryKey: [QUERY_KEYS.EVENT_ATTENDANCE_SUMMARY, eventID],
			});
		} catch (error) {
			console.error('Failed to record attendance', error);
			// The IPC helper rejects with an Error carrying the optional
			// { status, message, errorCode } shape the interceptor used.
			const err = error as {
				status?: number;
				message?: string;
				errorCode?: string;
			};

			if (err?.errorCode && DUPLICATE_ERROR_CODES.has(err.errorCode)) {
				// Duplicate scan — the student is already recorded for this
				// event. Warm orange flash instead of a red error.
				console.warn('Duplicate attendance scan', err);
				showFeedback(
					'duplicate',
					err.message ?? 'Student already recorded',
					id,
					DUPLICATE_OVERLAY_MS
				);
			} else {
				// Red overlay with the reason + the scanned ID
				showFeedback('error', err?.message ?? 'Failed to record attendance', id, ERROR_OVERLAY_MS);
			}
		} finally {
			isSubmittingRef.current = false;
			setIsSubmitting(false);
			clearInput();
		}
	};

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Text input keeps leading zeros intact — only keep digits, cap at 10.
		const digits = e.target.value.replace(/\D/g, '').slice(0, STUDENT_ID_LENGTH);
		setStudentID(digits);

		// Auto-submit once a full 10-digit code is present
		if (digits.length === STUDENT_ID_LENGTH) {
			submitAttendance(digits);
		}
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// Barcode scanners type the digits then send a trailing Enter. Manual
		// entry is confirmed the same way — submit whatever is in the field,
		// even if it is shorter than the full 10-digit ID.
		if (e.key === 'Enter') {
			e.preventDefault();
			if (studentID.trim()) {
				submitAttendance(studentID);
			}
		}
	};

	if (isLoading || isLoadingAttendances) {
		return (
			<div className="flex flex-col gap-5 pb-4">
				<div className="h-[92px] animate-pulse rounded-[26px] border border-white/[0.06] bg-white/[0.025]" />
				<div className="flex flex-col gap-5 xl:flex-row">
					<div className="flex-1 space-y-5">
						<div className="h-48 animate-pulse rounded-[26px] border border-white/[0.06] bg-white/[0.025]" />
						<div className="h-72 animate-pulse rounded-[26px] border border-white/[0.06] bg-white/[0.025]" />
					</div>
					<div className="h-64 animate-pulse rounded-[26px] border border-white/[0.06] bg-white/[0.025] xl:w-[320px]" />
				</div>
			</div>
		);
	}

	if (error || !event || errorAttendances || !attendancesData) {
		// Surface the real backend message — a bare "Error fetching event"
		// gives no hint of what went wrong (e.g. a command rejection).
		const messages = [error, errorAttendances]
			.map((e) => (e instanceof Error ? e.message : e ? String(e) : ''))
			.filter(Boolean)
			.join(' · ');

		return (
			<div
				className="flex flex-col items-center justify-center gap-3 py-20 text-center"
				role="alert"
			>
				<div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
					<WarningCircle className="w-6 h-6 text-red-400" />
				</div>
				<p className="text-white/70 font-medium">Error fetching event</p>
				{messages && <p className="text-sm text-white/35 max-w-md break-words">{messages}</p>}
				<button
					type="button"
					onClick={() => {
						queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENTS, eventID] });
						queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCES, eventID] });
					}}
					className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white/80 text-sm font-medium px-4 py-2.5 transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97]"
				>
					Try again
				</button>
			</div>
		);
	}

	const handleExportExcel = async () => {
		try {
			await exportEventExcel(event._id);
		} catch (error) {
			console.error('Failed to export Excel', error);
			notification({
				title: 'Export failed',
				message: error instanceof Error ? error.message : 'Failed to export Excel',
				color: 'red',
			});
		}
	};

	const start = new Date(event.startTime);
	const end = new Date(event.endTime);
	const dateLabel = isSameDay(start, end)
		? `${format(start, 'MMM d, yyyy · h:mm aaa')} – ${format(end, 'h:mm aaa')}`
		: `${format(start, 'MMM d, h:mm aaa')} – ${format(end, 'MMM d, h:mm aaa')}`;

	return (
		<div className="flex flex-col gap-5 pb-4">
			<PageHeader
				back={
					<button
						type="button"
						onClick={() => navigate(-1)}
						aria-label="Back to events"
						className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03] text-white/42 transition-[background-color,color,transform] duration-150 ease-apple-out hover:bg-white/[0.07] hover:text-white active:scale-90"
					>
						<CaretLeft className="h-4 w-4" />
					</button>
				}
				eyebrow={
					<>
						<span>{event.type}</span>
						<span className="h-[3px] w-[3px] rounded-full bg-white/20" />
						<span>{dateLabel}</span>
					</>
				}
				title={event.title}
				description={`${event.venue} · ${attendanceTotal ?? 0} records`}
				actions={<EventStatusPill event={event} />}
			/>

			<div className="flex flex-col items-start gap-5 xl:flex-row">
				{/* left section */}
				<div className="flex min-w-0 flex-1 flex-col gap-5">
					{/* Scan card */}
					<section className="panel p-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="eyebrow">Desk</p>
								<p className="mt-2 text-[15px] font-semibold tracking-title text-[#f5f5f7]">
									Scan attendance
								</p>
								<p className="mt-1 text-[11.5px] text-white/34">
									Scan a student ID to record their{' '}
									{timeType === 'Time In' ? 'time in' : 'time out'}
								</p>
							</div>

							{/* Apple segmented control — sliding thumb, spring, interruptible */}
							<SegmentedControl value={timeType} onChange={setTimeType} />
						</div>

						<div
							className={cn(
								'relative rounded-2xl',
								feedback?.type === 'success' && 'animate-[flash-success_ease-out_forwards]',
								feedback?.type === 'duplicate' && 'animate-[flash-warning_ease-out_forwards]'
							)}
							style={
								feedback?.type === 'success'
									? { animationDuration: `${SUCCESS_FLASH_MS}ms` }
									: feedback?.type === 'duplicate'
										? {
												animationDuration: `${DUPLICATE_OVERLAY_MS}ms`,
											}
										: undefined
							}
						>
							<Scan className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
							<input
								ref={studentIDInputRef}
								value={studentID}
								onChange={onChange}
								onKeyDown={onKeyDown}
								onBlur={onBlur}
								autoFocus
								aria-label="Student ID"
								disabled={isSubmitting}
								className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] py-4 pl-12 pr-4 font-mono text-[17px] tracking-[0.35em] text-white outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:tracking-normal placeholder:text-white/24 focus:border-[#5b8def]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(91,141,239,0.12)] disabled:opacity-50"
								type="text"
								inputMode="numeric"
								autoComplete="off"
								placeholder="Scan or type student ID"
							/>
						</div>
					</section>

					{/* recently recorded */}
					<section className="panel p-6">
						<div className="mb-3 flex items-center justify-between">
							<div>
								<p className="eyebrow">Log</p>
								<p className="mt-2 text-[15px] font-semibold tracking-title text-[#f5f5f7]">
									Recently recorded
								</p>
							</div>
							<span className="text-[10.5px] tabular-nums text-white/28">
								{attendanceTotal ?? attendances?.length ?? 0} records
							</span>
						</div>
						<AttendanceTable
							attendances={attendances ?? []}
							onAttendanceUpdated={async () => {
								setPage(1);
								await queryClient.invalidateQueries({
									queryKey: [QUERY_KEYS.ATTENDANCES, eventID],
								});
								await queryClient.invalidateQueries({
									queryKey: [QUERY_KEYS.EVENT_ATTENDANCE_SUMMARY, eventID],
								});
							}}
						/>
						{attendanceTotalPages > 1 && (
							<Pagination
								page={page}
								totalPages={attendanceTotalPages}
								onChange={setPage}
								className="mt-4"
							/>
						)}
					</section>
				</div>

				{/* Right section */}
				<aside className="w-full shrink-0 space-y-5 xl:w-[320px]">
					<EventAttendanceSummary event={event} />

					{/* Export */}
					<div className="panel p-5">
						<p className="eyebrow mb-4">Export</p>
						<button
							type="button"
							onClick={handleExportExcel}
							className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white/80 text-sm font-medium px-4 py-2.5 transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97]"
						>
							<DownloadSimple className="w-4 h-4" />
							Export Excel
						</button>
					</div>

					{/* Live clock */}
					<div className="panel flex items-center justify-between p-5">
						<LiveClock className="numeric text-[15px] font-medium tabular-nums text-white/60" />
						<span className="text-[10px] uppercase tracking-micro text-white/24">Local time</span>
					</div>
				</aside>
			</div>

			{/* Feedback — full-screen flash. Red for errors, warm orange for
			    duplicate scans. Non-blocking so the next scan can be recorded
			    while the operator reads the message. */}
			<ScanFeedbackOverlay feedback={feedback} reduceMotion={reduceMotion} />
		</div>
	);
}
