import { useMemo, useState } from 'react';
import { PieChart } from './bklit/pie-chart';
import { PieSlice } from './bklit/pie-slice';
import { PieCenter } from './bklit/pie-center';
import type { CourseDistributionData } from '../../api/dashboard';

const COURSE_COLORS = ['#5b8def', '#4fd1c5', '#9f8cf6', '#f5b85b', '#6fd08c', '#f07c9a'];
const OTHER_COLOR = 'rgba(235, 235, 245, 0.24)';

type CourseDonutProps = {
	data: CourseDistributionData[];
};

/**
 * Course mix as a donut with a real legend: hovering either the slice or its
 * row drives the other. Centre readout switches from the roster total to the
 * hovered course, so the legend doubles as the chart's labels.
 */
export default function CourseDonut({ data }: CourseDonutProps) {
	const [hovered, setHovered] = useState<number | null>(null);

	const slices = useMemo(() => {
		const top = data.slice(0, 5);
		const rest = data.slice(5);
		const restTotal = rest.reduce((sum, course) => sum + course.students, 0);
		const merged = [
			...top.map((course, index) => ({
				label: course.course,
				value: course.students,
				color: COURSE_COLORS[index % COURSE_COLORS.length],
			})),
			...(restTotal > 0 ? [{ label: 'Other courses', value: restTotal, color: OTHER_COLOR }] : []),
		];
		const total = merged.reduce((sum, slice) => sum + slice.value, 0);
		return { slices: merged, total };
	}, [data]);

	if (slices.slices.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
				<p className="text-[13px] font-medium text-white/45">No course data yet</p>
				<p className="max-w-[30ch] text-[11.5px] leading-relaxed text-white/25">
					Courses appear once the student masterlist has been imported.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-6 min-[1400px]:flex-row min-[1400px]:items-center min-[1400px]:gap-5">
			<div className="shrink-0">
				<PieChart
					data={slices.slices}
					size={190}
					innerRadius={64}
					padAngle={0.025}
					cornerRadius={4}
					hoverOffset={7}
					hoveredIndex={hovered}
					onHoverChange={setHovered}
				>
					{slices.slices.map((slice, index) => (
						<PieSlice key={slice.label} index={index} hoverEffect="translate" />
					))}
					<PieCenter
						defaultLabel="Students"
						valueClassName="numeric text-[30px] font-semibold tracking-display text-[#f5f5f7]"
						labelClassName="mt-1 uppercase tracking-micro text-[9.5px] font-medium text-white/35"
					/>
				</PieChart>
			</div>

			<ul className="min-w-0 flex-1 space-y-0.5 self-stretch">
				{slices.slices.map((slice, index) => {
					const percent = slices.total > 0 ? Math.round((slice.value / slices.total) * 100) : 0;
					const active = hovered === index;
					return (
						<li key={slice.label}>
							<button
								type="button"
								onMouseEnter={() => setHovered(index)}
								onMouseLeave={() => setHovered(null)}
								onFocus={() => setHovered(index)}
								onBlur={() => setHovered(null)}
								className="flex w-full items-center gap-2.5 rounded-lg px-2 py-[7px] text-left transition-colors duration-150 ease-apple-out hover:bg-white/[0.04] focus-visible:bg-white/[0.05] focus-visible:outline-none"
							>
								<span
									className="h-2 w-2 shrink-0 rounded-full transition-transform duration-200 ease-apple-out"
									style={{
										background: slice.color,
										transform: active ? 'scale(1.25)' : 'scale(1)',
									}}
								/>
								<span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/62">
									{slice.label}
								</span>
								<span className="numeric text-[12px] tabular-nums text-white/38">
									{slice.value.toLocaleString()}
								</span>
								<span
									className="numeric w-8 text-right text-[11px] tabular-nums"
									style={{ color: active ? 'rgba(235,235,245,0.85)' : 'rgba(235,235,245,0.3)' }}
								>
									{percent}%
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
