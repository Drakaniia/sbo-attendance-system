import { useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import type { APIResponse } from '../../types/api-response';
import { queryClient } from '../../main';
import { QUERY_KEYS } from '../../constants';
import { useNotification } from '../../hooks/useNotification';
import { Loader2, Upload } from 'lucide-react';

const ACCEPT =
	'.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function ImportStudentsButton() {
	const notification = useNotification();
	const inputRef = useRef<HTMLInputElement>(null);
	const [loading, setIsLoading] = useState(false);

	const onSubmit = async (file: File | null) => {
		try {
			setIsLoading(true);

			const formData = new FormData();
			if (file) formData.append('students_file_csv', file);

			await axiosInstance.post<APIResponse<null>>(
				'/student/file/import',
				formData
			);

			notification({
				title: 'Students imported successfully',
				message: '',
			});
			await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
		} catch (err) {
			console.error('Failed to import file', err);

			notification({
				title: 'Failed to import file',
				message: err instanceof Error ? err.message : 'Unknown error',
			});
		} finally {
			setIsLoading(false);
			if (inputRef.current) inputRef.current.value = '';
		}
	};

	return (
		<>
			<input
				ref={inputRef}
				type='file'
				accept={ACCEPT}
				onChange={(e) => onSubmit(e.target.files?.[0] ?? null)}
				className='hidden'
				aria-hidden='true'
				tabIndex={-1}
			/>
			<button
				type='button'
				onClick={() => inputRef.current?.click()}
				disabled={loading}
				className='inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white/80 text-sm font-medium px-4 py-2 transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'
			>
				{loading ? (
					<Loader2 className='w-4 h-4 motion-safe:animate-spin' />
				) : (
					<Upload className='w-4 h-4' />
				)}
				{loading ? 'Importing…' : 'Import Students'}
			</button>
		</>
	);
}
