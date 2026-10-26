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
		<div className="overflow-x-auto">
			<table className="w-full text-sm min-w-[600px]">
				<thead>
					<tr className="border-b border-white/[0.06]">
						{['Student ID', 'Name', 'Course', 'Year', 'Time In', 'Time Out'].map((head) => (
							<th
								key={head}
								className="whitespace-nowrap px-3 py-3 text-left text-[9.5px] font-semibold uppercase tracking-micro text-white/28 first:pl-0 last:pr-0"
							>
								{head}
							</th>
						))}
						<th className="w-0 whitespace-nowrap px-3 py-3 text-left text-[9.5px] font-semibold uppercase tracking-micro text-white/28" />
					</tr>
				</thead>
				<tbody>
					{attendances.map((attendance) => {
						return (
							<tr
								key={attendance._id}
								className="border-b border-white/[0.035] transition-colors hover:bg-white/[0.022]"
							>
								<td className="py-3 px-3 first:pl-0 font-mono text-xs text-white/60 tabular-nums">
									{attendance.studentID}
								</td>
								<td className="py-3 px-3 font-medium text-white/80 whitespace-nowrap">
									{attendance.student?.firstname ?? '—'} {attendance.student?.lastname ?? ''}
								</td>
								<td className="py-3 px-3 text-white/50 whitespace-nowrap">
									{attendance.student?.course ?? '—'}
								</td>
								<td className="py-3 px-3 text-white/50 tabular-nums">
									{attendance.student?.year ?? '—'}
								</td>
								<td className="py-3 px-3 text-white/60 tabular-nums whitespace-nowrap">
									{attendance.timeIn ? format(new Date(attendance.timeIn), TIME_FMT) : '—'}
								</td>
								<td className="py-3 px-3 text-white/60 tabular-nums whitespace-nowrap">
									{attendance.timeOut ? format(new Date(attendance.timeOut), TIME_FMT) : '—'}
								</td>
								<td className="py-3 px-3 last:pr-0">
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
							<td colSpan={7} className="py-12 text-center text-sm text-white/30">
								No attendance recorded yet
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
