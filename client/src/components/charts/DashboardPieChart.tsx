import {
	PieChart,
	Pie,
	Cell,
	Tooltip,
	ResponsiveContainer,
	Legend,
	type PieLabelRenderProps,
} from 'recharts';
import { useThemeStore } from '../../store/theme';
import { useMemo } from 'react';
import { useReducedMotion } from '@mantine/hooks';

type PieChartProps = {
	data: { name: string; value: number }[];
	colors: string[];
	height?: number;
	innerRadius?: number;
	outerRadius?: number;
	showLegend?: boolean;
};	export function DashboardPieChart({
	data,
	colors,
	height = 300,
	innerRadius = 55,
	outerRadius = 100,
	showLegend = true,
}: PieChartProps) {
	const theme = useThemeStore((state) => state.theme);
	const reducedMotion = useReducedMotion();
	const isDark = theme === 'dark';

	const total = useMemo(
		() => data.reduce((sum, d) => sum + d.value, 0),
		[data]
	);

	if (!data || data.length === 0) {
		return (
			<div
				className='flex items-center justify-center text-white/30 text-sm'
				style={{ height }}
			>
				No data available
			</div>
		);
	}

	const renderCustomLabel = ({
		cx,
		cy,
		midAngle,
		innerRadius,
		outerRadius,
		percent,
	}: PieLabelRenderProps) => {
		const safeCx = cx ?? 0;
		const safeCy = cy ?? 0;
		const safeMidAngle = midAngle ?? 0;
		const safeInnerRadius = innerRadius ?? 0;
		const safeOuterRadius = outerRadius ?? 0;
		const safePercent = percent ?? 0;
		const RADIAN = Math.PI / 180;
		const radius = safeInnerRadius + (safeOuterRadius - safeInnerRadius) * 0.6;
		const x = safeCx + radius * Math.cos(-safeMidAngle * RADIAN);
		const y = safeCy + radius * Math.sin(-safeMidAngle * RADIAN);

		if (safePercent < 0.05) return null;

		return (
			<text
				x={x}
				y={y}
				fill={isDark ? '#fff' : '#333'}
				textAnchor='middle'
				dominantBaseline='central'
				fontSize={12}
				fontWeight={600}
			>{`${(safePercent * 100).toFixed(0)}%`}</text>
		);
	};

	return (
		<ResponsiveContainer width='100%' height={height}>
			<PieChart>
				<Pie
					data={data}
					cx='50%'
					cy='50%'
					innerRadius={innerRadius}
					outerRadius={outerRadius}
					paddingAngle={3}
					cornerRadius={6}
					dataKey='value'
					nameKey='name'
					labelLine={false}
					label={renderCustomLabel}
					animationDuration={reducedMotion ? 0 : 1200}
					animationEasing='ease-out'
				>
					{data.map((_, index) => (
						<Cell
							key={`cell-${index}`}
							fill={colors[index % colors.length]}
							stroke='transparent'
						/>
					))}
				</Pie>
				{/* Center text showing total */}
				<text
					x='50%'
					y='47%'
					textAnchor='middle'
					dominantBaseline='middle'
					fill={isDark ? '#fff' : '#333'}
					fontSize={28}
					fontWeight={700}
				>
					{total}
				</text>
				<text
					x='50%'
					y='57%'
					textAnchor='middle'
					dominantBaseline='middle'
					fill={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
					fontSize={11}
					fontWeight={500}
				>
					Students
				</text>
				<Tooltip
					contentStyle={{
						background: isDark
							? 'rgba(30,30,30,0.95)'
							: 'rgba(255,255,255,0.95)',
						border: '1px solid rgba(255,255,255,0.1)',
						borderRadius: '12px',
						backdropFilter: 'blur(12px)',
						boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
						fontSize: '13px',
						padding: '10px 14px',
					}}
				/>
				{showLegend && (
					<Legend
						verticalAlign='bottom'
						height={36}
						iconType='circle'
						iconSize={8}
						formatter={(value: string) => (
							<span
								style={{
									color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
									fontSize: '12px',
								}}
							>
								{value}
							</span>
						)}
					/>
				)}
			</PieChart>
		</ResponsiveContainer>
	);
}
