import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { motion, useReducedMotion } from 'framer-motion';

/* ── Section shell ──────────────────────────────────── */

type SectionProps = {
	children: React.ReactNode;
	delay?: number;
};

export function Section({ children, delay = 0 }: SectionProps) {
	const reduceMotion = useReducedMotion();

	return (
		<motion.section
			initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={
				reduceMotion
					? { duration: 0.15 }
					: { type: 'spring', bounce: 0, duration: 0.4, delay: delay / 1000 }
			}
			className="panel p-6"
		>
			{children}
		</motion.section>
	);
}

/* ── Section label ──────────────────────────────────── */

export function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
	return (
		<div className="mb-5 flex items-center gap-2">
			<Icon className="h-3.5 w-3.5 text-white/28" />
			<p className="eyebrow">{label}</p>
		</div>
	);
}

/* ── Action button ──────────────────────────────────── */

type ActionButtonProps = {
	icon: React.ElementType;
	label: string;
	subtitle?: string;
	onClick: () => void;
	loading?: boolean;
	color?: 'default' | 'danger';
};

export function ActionButton({
	icon: Icon,
	label,
	subtitle,
	onClick,
	loading = false,
	color = 'default',
}: ActionButtonProps) {
	const hoverBg =
		color === 'danger'
			? 'hover:bg-red-400/[0.08] hover:border-red-400/20'
			: 'hover:bg-white/[0.08] hover:border-white/[0.14]';

	const hoverText = color === 'danger' ? 'group-hover:text-red-400' : 'group-hover:text-white';

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={loading}
			className={cn(
				'group flex w-full items-center gap-3.5 rounded-xl border border-white/[0.055] bg-white/[0.022] px-3.5 py-3 text-left transition-[background-color,border-color,transform] duration-150 ease-apple-out active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50',
				hoverBg
			)}
		>
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.045] transition-colors duration-150 group-hover:bg-white/[0.08]">
				{loading ? (
					<ArrowCounterClockwise className="w-4 h-4 text-white/50 motion-safe:animate-spin" />
				) : (
					<Icon className={cn('w-4 h-4 text-white/45 transition-colors duration-150', hoverText)} />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p
					className={cn(
						'text-[12.5px] font-medium text-white/68 transition-colors duration-150',
						hoverText
					)}
				>
					{label}
				</p>
				{subtitle && <p className="mt-0.5 truncate text-[11px] text-white/28">{subtitle}</p>}
			</div>
		</button>
	);
}

/* ── Toggle switch ──────────────────────────────────── */

export function ToggleSwitch({
	checked,
	onChange,
	disabled,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			disabled={disabled}
			className={cn(
				'relative inline-flex h-7 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-apple-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b8def]/45 disabled:opacity-40',
				checked ? 'bg-[#4f7fe0]' : 'bg-white/[0.10]'
			)}
		>
			<span
				className={cn(
					'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-apple-out',
					checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
				)}
			/>
		</button>
	);
}

/* ── Info row ───────────────────────────────────────── */

export function InfoRow({
	icon: Icon,
	label,
	value,
	mono,
	action,
}: {
	icon: React.ElementType;
	label: string;
	value: string;
	mono?: boolean;
	action?: { label: string; onClick: () => void };
}) {
	return (
		<div className="flex items-center justify-between gap-4 py-2.5 rounded-lg transition-colors duration-150">
			<div className="flex items-center gap-3 min-w-0">
				<Icon className="w-4 h-4 text-white/30 shrink-0" />
				<div className="min-w-0">
					<p className="text-[10.5px] text-white/28">{label}</p>
					<p
						className={cn(
							'truncate text-[12px] text-white/58',
							mono && 'font-mono text-[10.5px] text-white/45'
						)}
					>
						{value}
					</p>
				</div>
			</div>
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="shrink-0 text-xs text-white/40 hover:text-white/70 transition-colors duration-150 px-2 py-1 rounded-md hover:bg-white/[0.05] active:scale-[0.97]"
				>
					{action.label}
				</button>
			)}
		</div>
	);
}
