import { FileInput } from '@mantine/core';
import { IconFileCv } from '@tabler/icons-react';
import { queryClient } from '../main';
import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { QUERY_KEYS } from '../constants';
import type { APIResponse } from '../types/api-response';

export default function UploadStudents() {
	const icon = <IconFileCv size={18} stroke={1.5} />;
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

			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
		} catch (err: any) {
			console.error('Failed to import file', err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div>
			<FileInput
				disabled={loading}
				onChange={onSubmit}
				accept='.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				leftSection={icon}
				label='Upload CSV or Excel file'
				placeholder='Select file'
				leftSectionPointerEvents='none'
			/>
		</div>
	);
}
