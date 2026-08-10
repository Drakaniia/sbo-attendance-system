import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import RailTooltip from './RailTooltip';
import { NAV_SECTIONS, type SidebarItem } from '../constants/nav';
import { cn } from '../lib/utils';

const WIDTH_RAIL = 72;
const WIDTH_FULL = 256;

const STORAGE_KEY = 'seats-sidebar-collapsed';

type NavItemProps = {
	item: SidebarItem;
	collapsed: boolean;
};

function NavItem({ item, collapsed }: NavItemProps) {
	const reduceMotion = useReducedMotion();
	return (
		<NavLink
			to={item.path}
			className={cn(
				'group relative flex h-10 items-center outline-none transition-[background-color,transform] duration-150 ease-apple-out focus-visible:ring-2 focus-visible:ring-blue-400/50 active:scale-[0.97] [@media(hover:hover)]:hover:bg-white/[0.03]',
				!collapsed && 'rounded-xl px-3',
				collapsed && 'mx-auto w-10 justify-center rounded-full px-0'
			)}
		>
			{({ isActive }) => (
				<>
					{/* Active pill — slides between items on a critically damped spring */}
					{isActive &&
						(reduceMotion ? (
							<span
								className={cn(
									'absolute inset-0 border border-white/[0.08] bg-white/[0.07]',
									collapsed ? 'rounded-full' : 'rounded-xl'
								)}
							/>
						) : (
							<motion.span
								layoutId="sidebar-active-pill"
								className={cn(
									'absolute inset-0 border border-white/[0.08] bg-white/[0.07]',
									collapsed ? 'rounded-full' : 'rounded-xl'
								)}
								transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
							/>
						))}

					<item.icon
						className={cn(
							'relative z-10 h-5 w-5 shrink-0 transition-colors duration-200',
							isActive ? 'text-blue-400' : 'text-white/45 group-hover:text-white/80'
						)}
						strokeWidth={isActive ? 2.2 : 2}
					/>

					{/* Label — fades and its left margin animates with it, so the rail
					    stays perfectly centered with no gap-snap */}
					<span
						className={cn(
							'relative z-10 overflow-hidden transition-all duration-300 ease-apple-out',
							!collapsed ? 'ml-3 max-w-40 opacity-100' : 'ml-0 max-w-0 opacity-0'
						)}
					>
						<span
							className={cn(
								'block whitespace-nowrap text-[13px] font-medium',
								isActive ? 'text-white' : 'text-white/55 group-hover:text-white/85'
							)}
						>
							{item.title}
						</span>
					</span>

					{collapsed && <RailTooltip label={item.title} />}
				</>
			)}
		</NavLink>
	);
}

export default function Sidebar() {
	const reduceMotion = useReducedMotion();
	const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
		} catch {
			// storage unavailable — state stays in memory
		}
	}, [collapsed]);

	return (
		<motion.aside
			initial={false}
			animate={{ width: collapsed ? WIDTH_RAIL : WIDTH_FULL }}
			transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.5 }}
			className="sidebar-material sticky top-0 z-40 flex h-full shrink-0 flex-col border-r border-white/[0.06]"
		>
			{/* Wordmark — display tracking tight, micro caps subtitle */}
			<div
				className={cn('flex items-center gap-3 px-5 pb-5 pt-6', collapsed && 'justify-center px-0')}
			>
				<img
					src="/images/SBO_LOGO.jpg"
					alt="SBO logo"
					className={cn(
						'h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/10 transition-all duration-300',
						collapsed && 'h-9 w-9'
					)}
				/>
				<div
					className={cn(
						'overflow-hidden transition-all duration-300 ease-apple-out',
						collapsed ? 'max-w-0 opacity-0' : 'max-w-64 opacity-100'
					)}
				>
					<p className="whitespace-nowrap text-[17px] font-bold leading-tight tracking-display text-white">
						SEATS
					</p>
					<p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-micro text-white/35">
						Student Event Attendance
					</p>
				</div>
			</div>

			{/* Sections */}
			<nav
				aria-label="Primary"
				className={cn('flex-1 overflow-visible pb-4', collapsed ? 'px-0' : 'px-3')}
			>
				{NAV_SECTIONS.map((section) => (
					<div key={section.label} className="mb-4 last:mb-0">
						<div
							className={cn(
								'overflow-hidden transition-all duration-300 ease-apple-out',
								collapsed ? 'max-h-0 opacity-0' : 'max-h-8 opacity-100'
							)}
						>
							<p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-micro text-white/25">
								{section.label}
							</p>
						</div>
						<div className="space-y-1">
							{section.items.map((item) => (
								<NavItem key={item.title} item={item} collapsed={collapsed} />
							))}
						</div>
					</div>
				))}
			</nav>

			{/* Footer — collapse toggle */}
			<div className="border-t border-white/[0.06] p-3">
				<button
					onClick={() => setCollapsed((v) => !v)}
					aria-pressed={collapsed}
					aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					className={cn(
						'group relative flex h-10 items-center outline-none transition-[background-color,transform] duration-150 ease-apple-out focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97] [@media(hover:hover)]:hover:bg-white/[0.03]',
						collapsed
							? 'mx-auto w-10 justify-center rounded-full'
							: 'w-full justify-start rounded-xl px-3'
					)}
				>
					<CaretLeft
						className={cn(
							'h-5 w-5 shrink-0 text-white/45 transition-transform duration-300 ease-apple-out group-hover:text-white/80',
							collapsed && 'rotate-180'
						)}
					/>
					{!collapsed && (
						<span className="ml-3 whitespace-nowrap text-[13px] font-medium text-white/55 group-hover:text-white/85">
							Collapse sidebar
						</span>
					)}
					{collapsed && <RailTooltip label="Expand sidebar" />}
				</button>
			</div>
		</motion.aside>
	);
}
