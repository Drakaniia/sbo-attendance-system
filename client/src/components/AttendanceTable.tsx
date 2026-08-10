import { format } from 'date-fns';
import type { Attendance } from '../types/attendance';
import EditAttendanceModal from './modals/EditAttendanceModal';

type AttendanceTableProps = {
	attendances: Attendance[];
	onAttendanceUpdated?: (updated: Attendance) => void;
};

const TIME_FMT = 'hh:mm aaa';

export default function AttendanceTable({
	attendances,
	onAttendanceUpdated,
}: AttendanceTableProps) {
	return (
		<div className='overflow-x-auto'>
			<table className='w-full text-sm min-w-[600px]'>
				<thead>
					<tr className='border-b border-white/[0.06]'>
						{[
							'Student ID',
							'Name',
							'Course',
							'Year',
							'Time In',
							'Time Out',
						].map((head) => (
							<th
								key={head}
								className='text-left py-3 px-3 first:pl-0 last:pr-0 text-[11px] font-medium text-white/30 uppercase tracking-micro whitespace-nowrap'
							>
								{head}
							</th>
						))}
						<th className='text-left py-3 px-3 text-[11px] font-medium text-white/30 uppercase tracking-micro whitespace-nowrap w-0' />
					</tr>
				</thead>
				<tbody>
					{attendances.map((attendance) => {
						return (
							<tr
								key={attendance._id}
								className='border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]'
							>
								<td className='py-3 px-3 first:pl-0 font-mono text-xs text-white/60 tabular-nums'>
									{attendance.studentID}
								</td>
								<td className='py-3 px-3 font-medium text-white/80 whitespace-nowrap'>
									{attendance.student?.firstname ?? '—'} {attendance.student?.lastname ?? ''}
								</td>
								<td className='py-3 px-3 text-white/50 whitespace-nowrap'>
									{attendance.student?.course ?? '—'}
								</td>
								<td className='py-3 px-3 text-white/50 tabular-nums'>
									{attendance.student?.year ?? '—'}
								</td>
								<td className='py-3 px-3 text-white/60 tabular-nums whitespace-nowrap'>
									{attendance.timeIn ? format(new Date(attendance.timeIn), TIME_FMT) : '—'}
								</td>
								<td className='py-3 px-3 text-white/60 tabular-nums whitespace-nowrap'>
									{attendance.timeOut ? format(new Date(attendance.timeOut), TIME_FMT) : '—'}
								</td>
								<td className='py-3 px-3 last:pr-0'>
									<EditAttendanceModal
										attendance={attendance}
										onSuccess={(updated) => onAttendanceUpdated?.(updated)}
									/>
								</td>
							</tr>
						);
					})}
					{attendances.length === 0 && (
						<tr>
							<td
								colSpan={7}
								className='py-12 text-center text-sm text-white/30'
							>
								No attendance recorded yet
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
