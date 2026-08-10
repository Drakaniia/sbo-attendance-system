import { useEffect, useState, useRef } from 'react';
import { useReducedMotion } from '@mantine/hooks';
import { cn } from '../../lib/utils';
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import type { CSSProperties } from 'react';

type StatCardProps = {
	title: string;
	value: number | string;
	icon: React.ElementType;
	trend?: 'up' | 'down' | 'neutral';
	trendValue?: string;
	color?: string;
	delay?: number;
};

export function StatCard({
	title,
	value,
	icon: Icon,
	trend,
	trendValue,
	color = '#3b82f6',
	delay = 0,
}: StatCardProps) {
	const reducedMotion = useReducedMotion();

	const numericValue =
		typeof value === 'number'
			? value
			: parseInt(value as string) || 0;

	const [displayValue, setDisplayValue] = useState(() =>
		reducedMotion ? numericValue : 0
	);
	const [isVisible, setIsVisible] = useState(!!reducedMotion);
	const startedRef = useRef(false);

	useEffect(() => {
		if (reducedMotion) {
			setDisplayValue(numericValue);
			setIsVisible(true);
			return;
		}
		const timer = setTimeout(() => {
			setIsVisible(true);
		}, delay);
		return () => clearTimeout(timer);
	}, [delay, reducedMotion, numericValue]);

	useEffect(() => {
		if (!isVisible || startedRef.current || reducedMotion) return;
		startedRef.current = true;

		const duration = 1000;
		const startTime = performance.now();
		const startValue = 0;

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Ease-out cubic bezier
			const eased = 1 - Math.pow(1 - progress, 3);
			const current = Math.round(
				startValue + (numericValue - startValue) * eased
			);

			setDisplayValue(current);

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		requestAnimationFrame(animate);
	}, [isVisible, numericValue, reducedMotion]);

	const TrendIcon =
		trend === 'up'				? TrendUp
			: trend === 'down'
				? TrendDown
				: Minus;
	const trendColor =
		trend === 'up'
			? 'text-emerald-400'
			: trend === 'down'
				? 'text-red-400'
				: 'text-white/40';

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-2xl p-5 glass lift',
				reducedMotion || isVisible
					? 'opacity-100 translate-y-0'
					: 'opacity-0 translate-y-4'
			)}
			style={
				{
					'--stagger-delay': reducedMotion ? '0ms' : `${delay}ms`,
				} as CSSProperties
			}
		>
			{/* Glow dot */}
			<div
				className='absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-xl'
				style={{ background: color }}
			/>

			<div className='relative flex items-start justify-between'>
				<div className='flex-1'>
					<p className='text-sm text-white/40 font-medium mb-1.5 tracking-micro uppercase'>
						{title}
					</p>
					<p className='text-3xl font-bold text-white tracking-display tabular-nums'>
						{typeof value === 'number'
							? displayValue.toLocaleString()
							: value}
					</p>
					{trend && trendValue && (
						<div className='flex items-center gap-1 mt-2'>
							<TrendIcon className={cn('w-3.5 h-3.5', trendColor)} />
							<span className={cn('text-xs font-medium', trendColor)}>
								{trendValue}
							</span>
						</div>
					)}
				</div>
				<div
					className='p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]'
					style={{ color }}
				>
					<Icon className='w-5 h-5' />
				</div>
			</div>
		</div>
	);
}
