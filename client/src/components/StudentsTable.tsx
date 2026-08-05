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
		<div className='glass rounded-2xl overflow-hidden'>
			<div className='overflow-x-auto'>
				<table className='w-full text-sm min-w-[640px]'>
					<thead>
						<tr className='border-b border-white/[0.06]'>
							{['Student ID', 'Full name', 'Course', 'Year', 'Gender'].map(
								(head) => (
									<th
										key={head}
										className='text-left py-3.5 px-4 first:pl-6 last:pr-6 text-[11px] font-medium text-white/30 uppercase tracking-micro whitespace-nowrap'
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
									<td className='py-3.5 px-4 first:pl-6'>
										<div className='h-3 w-24 rounded-full bg-white/[0.05]' />
									</td>
									<td className='py-3.5 px-4'>
										<div className='flex items-center gap-3'>
											<div className='w-8 h-8 rounded-full bg-white/[0.05]' />
											<div className='h-3 w-36 rounded-full bg-white/[0.05]' />
										</div>
									</td>
									<td className='py-3.5 px-4'>
										<div className='h-3 w-16 rounded-full bg-white/[0.05]' />
									</td>
									<td className='py-3.5 px-4'>
										<div className='h-3 w-8 rounded-full bg-white/[0.05]' />
									</td>
									<td className='py-3.5 px-4 last:pr-6'>
										<div className='h-3 w-12 rounded-full bg-white/[0.05]' />
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
										<td className='py-3.5 px-4 first:pl-6 font-mono text-xs text-white/60 tabular-nums whitespace-nowrap'>
											{student.studentID}
										</td>
										<td className='py-3.5 px-4 whitespace-nowrap'>
											<div className='flex items-center gap-3'>
												<div
													className={cn(
														'w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold',
														avatarColor(name)
													)}
												>
													{initialsOf(student)}
												</div>
												<span className='font-medium text-white/85'>
													{name}
												</span>
											</div>
										</td>
										<td className='py-3.5 px-4 text-white/50 whitespace-nowrap'>
											{student.course}
										</td>
										<td className='py-3.5 px-4 text-white/50 tabular-nums'>
											{student.year}
										</td>
										<td className='py-3.5 px-4 last:pr-6'>
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
		</div>
	);
}
