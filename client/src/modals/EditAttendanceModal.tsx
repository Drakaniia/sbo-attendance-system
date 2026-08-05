import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import AppleModal from '../components/ui/AppleModal';
import { useNotification } from '../hooks/useNotification';
import type { Attendance } from '../types/attendance';
import { updateAttendanceStudentID } from '../api/attendance';
import type { AxiosError } from 'axios';

const STUDENT_ID_LENGTH = 10;

type EditAttendanceModalProps = {
	attendance: Attendance;
	onSuccess: (updated: Attendance) => void;
};

export default function EditAttendanceModal({
	attendance,
	onSuccess,
}: EditAttendanceModalProps) {
	const [opened, setOpened] = useState(false);
	const [studentID, setStudentID] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const notification = useNotification();

	// Pre-fill the input when the modal opens
	useEffect(() => {
		if (opened) {
			setStudentID(attendance.studentID);
			// Focus the input after the modal animation settles
			const t = setTimeout(() => inputRef.current?.focus(), 200);
			return () => clearTimeout(t);
		}
	}, [opened, attendance.studentID]);

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const digits = e.target.value.replace(/\D/g, '').slice(0, STUDENT_ID_LENGTH);
			setStudentID(digits);
		},
		[]
	);

	const handleSave = useCallback(async () => {
		if (studentID.length !== STUDENT_ID_LENGTH) return;
		if (studentID === attendance.studentID) {
			// Nothing changed — just close
			setOpened(false);
			return;
		}

		setIsSaving(true);
		try {
			const updated = await updateAttendanceStudentID(
				attendance._id,
				studentID
			);
			notification({
				title: 'Attendance updated',
				message: `Student ID changed to ${studentID}`,
				icon: <Check />,
				color: 'teal',
			});
			onSuccess(updated);
			setOpened(false);
		} catch (err) {
			const message =
				(err as AxiosError<{ message?: string }>)?.response?.data?.message ??
				'Failed to update attendance';
			notification({
				title: 'Update failed',
				message: message,
				color: 'red',
			});
		} finally {
			setIsSaving(false);
		}
	}, [studentID, attendance, onSuccess, notification]);

	const hasChanged = studentID !== attendance.studentID;
	const isValid = studentID.length === STUDENT_ID_LENGTH;

	return (
		<>
			<button
				type='button'
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setOpened(true);
				}}
				aria-label='Edit attendance'
				title='Edit student ID'
				className='p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/[0.06] transition-colors active:scale-90'
			>
				<Pencil className='w-3.5 h-3.5' />
			</button>

			<AppleModal
				opened={opened}
				onClose={() => !isSaving && setOpened(false)}
				title='Edit Attendance'
				subtitle='Change the student ID for this attendance record'
				size='sm'
			>
				<div className='flex flex-col gap-4'>
					{/* Current student preview */}
					<div className='rounded-xl bg-white/[0.04] border border-white/[0.06] p-4'>
						<p className='text-[11px] font-semibold text-white/30 uppercase tracking-micro mb-3'>
							Current record
						</p>
						<div className='space-y-1.5'>
							<p className='text-sm font-medium text-white/80'>
								{attendance.student.firstname || '—'}{' '}
								{attendance.student.lastname || ''}
							</p>
							<p className='text-xs text-white/40'>
								{attendance.student.course || 'No course'} · Year{' '}
								{attendance.student.year}
							</p>
							<p className='font-mono text-xs text-white/50'>
								ID: {attendance.studentID}
							</p>
						</div>
					</div>

					{/* New student ID input */}
					<div>
						<label
							htmlFor='edit-student-id'
							className='text-[11px] font-semibold text-white/30 uppercase tracking-micro'
						>
							New student ID
						</label>
						<input
							ref={inputRef}
							id='edit-student-id'
							type='text'
							inputMode='numeric'
							autoComplete='off'
							value={studentID}
							onChange={onChange}
							disabled={isSaving}
							className='mt-1.5 w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3 font-mono text-base tracking-[0.3em] text-white placeholder:text-white/30 outline-none transition-[border-color,background-color] duration-200 focus:border-blue-400/40 focus:bg-white/[0.08] disabled:opacity-50'
							placeholder='Enter 10-digit ID'
						/>
						<p className='text-xs text-white/30 mt-1.5'>
							{studentID.length}/{STUDENT_ID_LENGTH} digits
						</p>
					</div>

					{/* Actions */}
					<div className='flex items-center justify-end gap-2.5 pt-1'>
						<button
							onClick={() => setOpened(false)}
							disabled={isSaving}
							className='px-4 py-2 rounded-full text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40'
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={isSaving || !isValid || !hasChanged}
							className='inline-flex items-center gap-2 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-white/[0.08] disabled:text-white/30 text-white text-sm font-semibold px-4 py-2 transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97] disabled:active:scale-100'
						>
							{isSaving && <Loader2 className='w-3.5 h-3.5 animate-spin' />}
							{isSaving ? 'Saving…' : 'Save'}
						</button>
					</div>
				</div>
			</AppleModal>
		</>
	);
}
