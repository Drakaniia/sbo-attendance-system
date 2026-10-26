import { format } from 'date-fns';
import { AreaChart, Area } from './bklit/area-chart';
import { Grid } from './bklit/grid';
import { XAxis } from './bklit/x-axis';
import { ChartTooltip } from './bklit/tooltip';
import type { AttendanceTrendData } from '../../api/dashboard';

const CHECK_INS = '#6e9bff';
const CHECK_OUTS = '#43d7b0';

type AttendanceTrendChartData = Pick<AttendanceTrendData, 'date' | 'checkIns' | 'checkOuts'>;

type AttendanceTrendChartProps = {
	data: AttendanceTrendChartData[];
	className?: string;
};

/**
 * The dashboard's primary time-series instrument. Built on Bklit UI's
 * composable area chart: shared time scale, gradient fills, spring crosshair,
 * and a two-row tooltip in the product's own type and colour.
 */
export default function AttendanceTrendChart({ data, className }: AttendanceTrendChartProps) {
	const series = data.map((point) => ({
		date: new Date(point.date),
		'Check-ins': point.checkIns,
		'Check-outs': point.checkOuts,
	}));

	if (series.length === 0) {
		return (
			<div
				className={`flex flex-col items-center justify-center gap-2 text-center ${className ?? ''}`}
			>
				<p className="text-[13px] font-medium text-white/45">No attendance activity yet</p>
				<p className="max-w-[28ch] text-[11.5px] leading-relaxed text-white/25">
					Daily check-ins appear here once students are scanned at an event.
				</p>
			</div>
		);
	}

	return (
		<AreaChart
			data={series}
			xDataKey="date"
			aspectRatio="auto"
			margin={{ top: 14, right: 10, bottom: 30, left: 2 }}
			className={className}
			animationDuration={1300}
		>
			<Grid horizontal strokeOpacity={0.55} />
			<Area
				dataKey="Check-ins"
				fill={CHECK_INS}
				stroke={CHECK_INS}
				fillOpacity={0.28}
				gradientToOpacity={0}
				strokeWidth={2}
				fadeEdges="right"
			/>
			<Area
				dataKey="Check-outs"
				fill={CHECK_OUTS}
				stroke={CHECK_OUTS}
				fillOpacity={0.18}
				gradientToOpacity={0}
				strokeWidth={2}
				fadeEdges="right"
			/>
			<XAxis />
			<ChartTooltip
				showDatePill
				dotVariant="ring"
				dotSize={4.5}
				indicatorDasharray="3 4"
				rows={(point) => [
					{
						color: CHECK_INS,
						label: 'Check-ins',
						value: (point['Check-ins'] as number).toLocaleString(),
					},
					{
						color: CHECK_OUTS,
						label: 'Check-outs',
						value: (point['Check-outs'] as number).toLocaleString(),
					},
				]}
				panelStyle={{
					borderRadius: 16,
					background: 'rgba(16, 17, 21, 0.92)',
					border: '1px solid rgba(255, 255, 255, 0.10)',
					boxShadow: '0 24px 60px -16px rgba(0, 0, 0, 0.85)',
					backdropFilter: 'blur(24px)',
					padding: '10px 12px',
				}}
				dateLabels={series.map((point) => format(point.date, 'EEE, MMM d'))}
			/>
		</AreaChart>
	);
}
