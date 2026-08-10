import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants';
import { fetchSingleEvent } from '../../api/event';
import { Check, DownloadSimple, Scan } from '@phosphor-icons/react';
import LiveClock from '../../components/LiveClock';
import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axios-instance';
import { useNotification } from '../../hooks/useNotification';
import { fetchRecentlyRecordedAttendances } from '../../api/attendance';
import { queryClient } from '../../main';
import AttendanceTable from '../../components/AttendanceTable';
import Pagination from '../../components/ui/Pagination';
import EventAttendanceSummary from '../../components/EventAttendanceSummary';
import { cn } from '../../lib/utils';
import { useReducedMotion } from 'framer-motion';
import EventStatusPill from '../../components/EventStatusPill';
import EventHeader from './EventHeader';
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
		if (id.length !== STUDENT_ID_LENGTH) return;

		isSubmittingRef.current = true;
		setIsSubmitting(true);

		try {
			if (timeType === 'Time In') {
				await axiosInstance.post(`/attendance/record/time-in/event/${eventID}`, { studentID: id });
			} else {
				await axiosInstance.post(`/attendance/record/time-out/event/${eventID}`, { studentID: id });
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
			// The axios interceptor rejects with a plain { status, message,
			// errorCode } object, not an Error instance.
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
		// Barcode scanners type the digits then send a trailing Enter.
		if (e.key === 'Enter') {
			e.preventDefault();
			if (studentID.length === STUDENT_ID_LENGTH) {
				submitAttendance(studentID);
			}
		}
	};

	if (isLoading || isLoadingAttendances) {
		return (
			<div className="flex flex-col gap-6 pb-8 -mx-5 -mt-5 px-5">
				<div className="h-20 rounded-2xl glass animate-pulse" />
				<div className="flex gap-5">
					<div className="flex-1 space-y-5">
						<div className="h-48 rounded-2xl glass animate-pulse" />
						<div className="h-72 rounded-2xl glass animate-pulse" />
					</div>
					<div className="w-[30%] h-64 rounded-2xl glass animate-pulse" />
				</div>
			</div>
		);
	}

	if (error || !event || errorAttendances || !attendancesData) {
		return <div>Error fetching event</div>;
	}

	return (
		<div className="flex flex-col gap-6 pb-8 -mx-5 -mt-5 px-5">
			{/* Sticky toolbar */}
			<header className="sticky -top-5 z-20 glass-heavy pt-5 pb-4 -mx-5 px-5">
				<EventHeader event={event} reduceMotion={reduceMotion} />
			</header>

			<div className="flex gap-5 items-start">
				{/* left section */}
				<div className="flex flex-col gap-5 flex-1 min-w-0">
					{/* Scan card */}
					<section className="glass glass-hover rounded-2xl p-5">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
							<div>
								<p className="text-base font-semibold text-white tracking-tight">Scan attendance</p>
								<p className="text-sm text-white/40 mt-0.5">
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
								className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] pl-12 pr-4 py-4 font-mono text-lg tracking-[0.35em] text-white placeholder:text-white/30 placeholder:tracking-normal outline-none transition-[border-color,background-color] duration-200 focus:border-blue-400/40 focus:bg-white/[0.06] disabled:opacity-50"
								type="text"
								inputMode="numeric"
								autoComplete="off"
								placeholder="Scan or type student ID"
							/>
						</div>
					</section>

					{/* recently recorded */}
					<section className="glass glass-hover rounded-2xl p-5">
						<div className="flex items-center justify-between mb-3">
							<p className="text-base font-semibold text-white tracking-tight">Recently recorded</p>
							<span className="text-xs text-white/40 tabular-nums">
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
				<aside className="w-[30%] shrink-0 space-y-5">
					<EventAttendanceSummary event={event} />

					{/* Export */}
					<div className="glass glass-hover rounded-2xl p-5">
						<p className="text-[11px] font-semibold text-white/40 uppercase tracking-micro mb-4">
							Export
						</p>
						<a
							href={`http://127.0.0.1:8000/api/v1/attendance/event/${event._id}/download/csv`}
							target="_blank"
							rel="noreferrer"
							className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white/80 text-sm font-medium px-4 py-2.5 transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97]"
						>
							<DownloadSimple className="w-4 h-4" />
							Download CSV
						</a>
					</div>

					{/* Live clock */}
					<div className="glass rounded-2xl p-5 flex items-center justify-between">
						<LiveClock />
						<EventStatusPill event={event} size="sm" />
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
