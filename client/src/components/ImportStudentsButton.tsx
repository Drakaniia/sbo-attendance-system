import { useState } from 'react';
import { queryClient } from '../main';
import { QUERY_KEYS } from '../constants';
import { useNotification } from '../hooks/useNotification';
import { importStudentsFile } from '../lib/tauri';
import { ArrowCounterClockwise, UploadSimple } from '@phosphor-icons/react';

export default function ImportStudentsButton() {
	const notification = useNotification();
	const [loading, setIsLoading] = useState(false);

	const handleImport = async () => {
		try {
			setIsLoading(true);

			const count = await importStudentsFile();

			notification({
				title: 'Students imported successfully',
				message: `${count} record${count === 1 ? '' : 's'} imported`,
			});
			await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
			await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENT_COURSES] });
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : 'Unknown error';
			// "No file selected" is not an error — the user just cancelled.
			if (msg === 'No file selected') return;

			notification({
				title: 'Failed to import file',
				message: msg,
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<button
			type='button'
			onClick={handleImport}
			disabled={loading}
			className='inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white/80 text-sm font-medium px-4 py-2 transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'
		>
			{loading ? (
				<ArrowCounterClockwise className='w-4 h-4 motion-safe:animate-spin' />
			) : (
				<UploadSimple className='w-4 h-4' />
			)}
			{loading ? 'Importing…' : 'Import Students'}
		</button>
	);
}
