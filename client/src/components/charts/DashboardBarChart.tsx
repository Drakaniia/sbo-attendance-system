import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts';
import { useThemeStore } from '../../store/theme';
import { useReducedMotion } from '@mantine/hooks';

type BarChartProps = {
	data: Record<string, unknown>[];
	dataKeys: { key: string; color: string; name: string }[];
	xKey: string;
	height?: number;
	showGrid?: boolean;
	layout?: 'vertical' | 'horizontal';
	rounded?: boolean;
};
export function DashboardBarChart({
	data,
	dataKeys,
	xKey,
	height = 300,
	showGrid = true,
	layout = 'horizontal',
	rounded = true,
}: BarChartProps) {
	const theme = useThemeStore((state) => state.theme);
	const reducedMotion = useReducedMotion();
	const isDark = theme === 'dark';

	const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
	const axisColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center text-white/30 text-sm" style={{ height }}>
				No data available
			</div>
		);
	}

	const barRadius: [number, number, number, number] = rounded ? [6, 6, 0, 0] : [0, 0, 0, 0];

	const reversedData = layout === 'vertical' ? [...data].reverse() : data;

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart
				data={reversedData}
				layout={layout}
				margin={{ top: 10, right: 10, left: layout === 'vertical' ? 10 : -10, bottom: 0 }}
			>
				{showGrid && (
					<CartesianGrid
						strokeDasharray="3 3"
						stroke={gridColor}
						vertical={false}
						horizontal={layout === 'vertical'}
					/>
				)}
				{layout === 'horizontal' ? (
					<>
						<XAxis
							dataKey={xKey}
							axisLine={false}
							tickLine={false}
							tick={{ fill: axisColor, fontSize: 11 }}
							dy={8}
							angle={-25}
							textAnchor="end"
							interval={0}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							tick={{ fill: axisColor, fontSize: 12 }}
							dx={-8}
							allowDecimals={false}
						/>
					</>
				) : (
					<>
						<XAxis
							type="number"
							axisLine={false}
							tickLine={false}
							tick={{ fill: axisColor, fontSize: 12 }}
							allowDecimals={false}
						/>
						<YAxis
							type="category"
							dataKey={xKey}
							axisLine={false}
							tickLine={false}
							tick={{ fill: axisColor, fontSize: 11 }}
							width={100}
						/>
					</>
				)}
				<Tooltip
					contentStyle={{
						background: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
						border: '1px solid rgba(255,255,255,0.1)',
						borderRadius: '12px',
						backdropFilter: 'blur(12px)',
						boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
						fontSize: '13px',
						padding: '10px 14px',
					}}
					labelStyle={{ color: isDark ? '#aaa' : '#666', fontWeight: 500 }}
				/>
				{dataKeys.map((dk) => (
					<Bar
						key={dk.key}
						dataKey={dk.key}
						name={dk.name}
						fill={dk.color}
						radius={barRadius}
						barSize={layout === 'horizontal' ? 32 : 16}
						animationDuration={reducedMotion ? 0 : 1000}
						animationEasing="ease-out"
					>
						{data.map((_, index) => (
							<Cell
								key={`cell-${index}`}
								fill={dk.color}
								fillOpacity={layout === 'vertical' ? 1 - index * 0.05 : 0.85}
							/>
						))}
					</Bar>
				))}
			</BarChart>
		</ResponsiveContainer>
	);
}
