import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { useThemeStore } from '../../store/theme';
import { useMemo } from 'react';
import { useReducedMotion } from '@mantine/hooks';

type AreaChartProps = {
	data: Record<string, unknown>[];
	dataKeys: { key: string; color: string; name: string }[];
	xKey: string;
	height?: number;
	showGrid?: boolean;
	curveType?: 'monotone' | 'linear' | 'step' | 'basis';
	gradientFrom?: string;
	gradientTo?: string;
};	export function DashboardAreaChart({
	data,
	dataKeys,
	xKey,
	height = 300,
	showGrid = true,
	curveType = 'monotone',
	gradientFrom,
	gradientTo,
}: AreaChartProps) {
	const theme = useThemeStore((state) => state.theme);
	const reducedMotion = useReducedMotion();
	const isDark = theme === 'dark';

	const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
	const axisColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

	const gradientId = useMemo(
		() => `areaGradient-${dataKeys[0]?.key ?? 'default'}`,
		[dataKeys]
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

	return (
		<ResponsiveContainer width='100%' height={height}>
			<AreaChart
				data={data}
				margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
			>
				<defs>
					<linearGradient
						id={gradientId}
						x1='0'
						y1='0'
						x2='0'
						y2='1'
					>
						<stop
							offset='0%'
							stopColor={gradientFrom || dataKeys[0]?.color || '#3b82f6'}
							stopOpacity={0.3}
						/>
						<stop
							offset='100%'
							stopColor={gradientTo || gradientFrom || dataKeys[0]?.color || '#3b82f6'}
							stopOpacity={0.02}
						/>
					</linearGradient>
				</defs>
				{showGrid && (
					<CartesianGrid
						strokeDasharray='3 3'
						stroke={gridColor}
						vertical={false}
					/>
				)}
				<XAxis
					dataKey={xKey}
					axisLine={false}
					tickLine={false}
					tick={{ fill: axisColor, fontSize: 12 }}
					dy={8}
				/>
				<YAxis
					axisLine={false}
					tickLine={false}
					tick={{ fill: axisColor, fontSize: 12 }}
					dx={-8}
					allowDecimals={false}
				/>
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
					labelStyle={{ color: isDark ? '#aaa' : '#666', fontWeight: 500 }}
				/>
				{dataKeys.map((dk) => (
					<Area
						key={dk.key}
						type={curveType}
						dataKey={dk.key}
						stroke={dk.color}
						fill={`url(#${gradientId})`}
						strokeWidth={2}
						dot={false}
						activeDot={{
							r: 4,
							fill: dk.color,
							stroke: isDark ? '#1a1a1a' : '#fff',
							strokeWidth: 2,
						}}
						name={dk.name}
						animationDuration={reducedMotion ? 0 : 1200}
						animationEasing='ease-out'
					/>
				))}
			</AreaChart>
		</ResponsiveContainer>
	);
}
