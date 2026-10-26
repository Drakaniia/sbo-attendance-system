import { BarChart } from './bklit/bar-chart';
import { Bar } from './bklit/bar';
import { Grid } from './bklit/grid';
import { BarYAxis } from './bklit/bar-y-axis';
import { ChartTooltip } from './bklit/tooltip';
import type { EventAttendanceData } from '../../api/dashboard';

const CHECK_INS = '#6e9bff';
const CHECK_OUTS = '#43d7b0';

type EventAttendanceChartProps = {
	events: EventAttendanceData[];
	className?: string;
};

/**
 * Horizontal grouped bars, ordered by turnout. Bklit handles the band scale,
 * spring entrance, hover dimming, and crosshair tooltip; the label column is
 * widened so real event names fit without turning into codes.
 */
export default function EventAttendanceChart({ events, className }: EventAttendanceChartProps) {
	const ranked = [...events]
		.sort((a, b) => b.checkIns - a.checkIns)
		.slice(0, 6)
		.map((event) => ({
			name: event.title,
			'Check-ins': event.checkIns,
			'Check-outs': event.checkOuts,
			startTime: event.startTime,
		}));

	if (ranked.length === 0) {
		return (
			<div
				className={`flex flex-col items-center justify-center gap-2 text-center ${className ?? ''}`}
			>
				<p className="text-[13px] font-medium text-white/45">No events to compare yet</p>
				<p className="max-w-[30ch] text-[11.5px] leading-relaxed text-white/25">
					Create an event and start scanning to see turnout per event.
				</p>
			</div>
		);
	}

	return (
		<BarChart
			data={ranked}
			xDataKey="name"
			orientation="horizontal"
			aspectRatio="auto"
			barGap={0.32}
			margin={{ top: 6, right: 10, bottom: 6, left: 168 }}
			className={className}
			animationDuration={1100}
		>
			<Grid horizontal={false} vertical fadeVertical strokeDasharray="2 5" />
			<Bar dataKey="Check-ins" fill={CHECK_INS} lineCap={5} groupGap={3} />
			<Bar dataKey="Check-outs" fill={CHECK_OUTS} lineCap={5} groupGap={3} />
			<BarYAxis labelWidth={150} labelClassName="text-[11.5px] font-medium" />
			<ChartTooltip
				showCrosshair={false}
				showDots={false}
				rows={(point) => [
					{
						color: CHECK_INS,
						label: 'Checked in',
						value: (point['Check-ins'] as number).toLocaleString(),
					},
					{
						color: CHECK_OUTS,
						label: 'Checked out',
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
			/>
		</BarChart>
	);
}
