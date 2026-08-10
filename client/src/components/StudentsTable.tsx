import { motion } from 'framer-motion';
import type { Student } from '../types/student';
import { cn } from '../lib/utils';

interface StudentsTableProps {
	students: Student[] | undefined;
	isLoading: boolean;
}

/** Deterministic pastel for the avatar, derived from the student's name. */
const AVATAR_COLORS = [
	'bg-blue-400/15 text-blue-300',
	'bg-emerald-400/15 text-emerald-300',
	'bg-violet-400/15 text-violet-300',
	'bg-amber-400/15 text-amber-300',
	'bg-rose-400/15 text-rose-300',
	'bg-sky-400/15 text-sky-300',
	'bg-pink-400/15 text-pink-300',
];

function avatarColor(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
	}
	return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsOf(student: Student): string {
	return `${student.firstname[0] ?? ''}${student.lastname[0] ?? ''}`.toUpperCase();
}

export default function StudentsTable({
	students,
	isLoading,
}: StudentsTableProps) {
	return (
		<div className='glass w-full min-w-0 overflow-hidden rounded-2xl'>
			<table className='w-full table-fixed text-sm'>
					<thead>
						<tr className='border-b border-white/[0.06]'>
							{['Student ID', 'Full name', 'Course', 'Year', 'Gender'].map(
								(head) => (
									<th
										key={head}
										className={cn(
											'break-words px-2 py-3 text-left text-[10px] font-medium uppercase tracking-micro text-white/30 first:pl-3 last:pr-3 sm:px-4 sm:py-3.5 sm:text-[11px] sm:first:pl-6 sm:last:pr-6',
										head === 'Student ID' && 'w-[34%] sm:w-[20%]',
										head === 'Full name' && 'w-[66%] sm:w-[35%]',
										head === 'Course' && 'hidden sm:table-cell sm:w-[20%]',
										head === 'Year' && 'hidden sm:table-cell sm:w-[10%]',
										head === 'Gender' && 'hidden sm:table-cell sm:w-[15%]'
									)}
									>
										{head}
									</th>
								)
							)}
						</tr>
					</thead>
					<tbody>
						{isLoading &&
							[0, 1, 2, 3, 4].map((i) => (
								<tr
									key={i}
									className='border-b border-white/[0.03] animate-pulse'
								>
									<td className='px-2 py-3 first:pl-3 sm:px-4 sm:py-3.5 sm:first:pl-6'>
										<div className='h-3 w-24 rounded-full bg-white/[0.05]' />
									</td>
									<td className='px-2 py-3 sm:px-4 sm:py-3.5'>
										<div className='flex min-w-0 items-center gap-3'>
											<div className='w-8 h-8 rounded-full bg-white/[0.05]' />
											<div className='h-3 w-36 rounded-full bg-white/[0.05]' />
										</div>
									</td>
									<td className='hidden px-2 py-3 sm:table-cell sm:px-4 sm:py-3.5'>
										<div className='h-3 w-full max-w-16 rounded-full bg-white/[0.05]' />
									</td>
									<td className='hidden px-2 py-3 sm:table-cell sm:px-4 sm:py-3.5'>
										<div className='h-3 w-full max-w-8 rounded-full bg-white/[0.05]' />
									</td>
									<td className='hidden px-2 py-3 last:pr-3 sm:table-cell sm:px-4 sm:py-3.5 sm:last:pr-6'>
										<div className='h-3 w-full max-w-12 rounded-full bg-white/[0.05]' />
									</td>
								</tr>
							))}

						{!isLoading &&
							students?.map((student, i) => {
								const name = `${student.firstname} ${
									student.middlename ? student.middlename + ' ' : ''
								}${student.lastname}`.trim();
								return (
									<motion.tr
										key={student._id}
										className='border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]'
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											type: 'spring',
											bounce: 0,
											duration: 0.35,
											delay: i * 0.03,
										}}
									>
										<td className='break-all px-2 py-3 text-xs font-mono tabular-nums text-white/60 first:pl-3 sm:px-4 sm:py-3.5 sm:first:pl-6'>
											{student.studentID}
										</td>
										<td className='min-w-0 break-words px-2 py-3 sm:px-4 sm:py-3.5'>
											<div className='flex min-w-0 items-center gap-3'>
												<div
													className={cn(
														'w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold',
														avatarColor(name)
													)}
												>
													{initialsOf(student)}
												</div><span className='min-w-0 break-words font-medium text-white/85'>
													{name}
													<span className='mt-0.5 block break-words text-[11px] font-normal text-white/35 sm:hidden'>
														{student.course} · Year {student.year} ·{' '}
														{student.gender === 'M' ? 'Male' : 'Female'}
													</span>
												</span>
											</div>
										</td>
										<td className='hidden break-words px-2 py-3 text-white/50 sm:table-cell sm:px-4 sm:py-3.5'>
											{student.course}
										</td>
										<td className='hidden px-2 py-3 tabular-nums text-white/50 sm:table-cell sm:px-4 sm:py-3.5'>
											{student.year}
										</td>
										<td className='hidden px-2 py-3 last:pr-3 sm:table-cell sm:px-4 sm:py-3.5 sm:last:pr-6'>
											<span
												className={cn(
													'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border border-white/[0.08] bg-white/[0.04]',
													student.gender === 'M'
														? 'text-sky-300'
														: 'text-pink-300'
												)}
											>
												{student.gender === 'M' ? 'Male' : 'Female'}
											</span>
										</td>
									</motion.tr>
								);
							})}
					</tbody>
				</table>
		</div>
	);
}
