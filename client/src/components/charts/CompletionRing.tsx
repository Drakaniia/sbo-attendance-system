import { RingChart } from './bklit/ring-chart';
import { Ring } from './bklit/ring';
import { RingCenter } from './bklit/ring-center';

type CompletionRingProps = {
	rate: number;
	checkIns: number;
	checkOuts: number;
	size?: number;
};

function completionColor(rate: number) {
	if (rate >= 85) return '#43d7b0';
	if (rate >= 60) return '#6e9bff';
	if (rate >= 35) return '#f5b85b';
	return '#f07c9a';
}

/**
 * A single-ring gauge for the share of check-ins that were also checked out.
 * The number in the middle is the chart — the ring supplies context, not
 * decoration. Colors carry meaning: mint closes the loop, amber asks for
 * attention.
 */
export default function CompletionRing({
	rate,
	checkIns,
	checkOuts,
	size = 196,
}: CompletionRingProps) {
	const color = completionColor(rate);
	const open = Math.max(checkIns - checkOuts, 0);

	return (
		<div className="flex flex-col items-center">
			<RingChart
				data={[{ label: 'Checked out', value: rate, maxValue: 100, color }]}
				size={size}
				strokeWidth={14}
				baseInnerRadius={size / 2 - 26}
				animationDuration={1200}
			>
				<Ring index={0} color={color} lineCap="round" showGlow={false} />
				<RingCenter
					defaultLabel="Completion"
					suffix="%"
					formatOptions={{ maximumFractionDigits: 0 }}
					valueClassName="numeric text-[34px] font-semibold tracking-display text-[#f5f5f7] leading-none"
					labelClassName="mt-1.5 uppercase tracking-micro text-[9.5px] font-medium text-white/35"
				/>
			</RingChart>

			<p className="mt-3 max-w-[24ch] text-center text-[11.5px] leading-relaxed text-white/32">
				<span className="numeric text-white/55">{checkOuts.toLocaleString()}</span> of{' '}
				<span className="numeric text-white/55">{checkIns.toLocaleString()}</span> check-ins closed
				{open > 0 && (
					<>
						{' · '}
						<span className="numeric text-white/55">{open.toLocaleString()}</span> still open
					</>
				)}
			</p>
		</div>
	);
}
