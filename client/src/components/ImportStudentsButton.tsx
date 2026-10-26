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
			const msg = err instanceof Error ? err.message : 'Unknown error';
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
			type="button"
			onClick={handleImport}
			disabled={loading}
			className="control h-8 gap-1.5 px-3 text-[11.5px] disabled:cursor-not-allowed disabled:opacity-50"
		>
			{loading ? (
				<ArrowCounterClockwise className="h-3.5 w-3.5 motion-safe:animate-spin" />
			) : (
				<UploadSimple className="h-3.5 w-3.5" />
			)}
			{loading ? 'Importing…' : 'Import students'}
		</button>
	);
}
