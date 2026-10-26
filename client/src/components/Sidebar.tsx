import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, NavLink } from 'react-router-dom';
import { CaretDoubleLeft, Database } from '@phosphor-icons/react';
import RailTooltip from './RailTooltip';
import { NAV_SECTIONS, type SidebarItem } from '../constants/nav';
import { cn } from '../lib/utils';

const WIDTH_RAIL = 80;
const WIDTH_FULL = 260;

const STORAGE_KEY = 'seats-sidebar-collapsed';

function NavItem({ item, collapsed }: { item: SidebarItem; collapsed: boolean }) {
	const reduceMotion = useReducedMotion();

	return (
		<NavLink
			to={item.path}
			aria-label={collapsed ? item.title : undefined}
			className={cn(
				'group relative flex h-[38px] items-center rounded-[11px] outline-none',
				'transition-[background-color,border-color,transform] duration-150 ease-apple-out active:scale-[0.985]',
				'focus-visible:ring-2 focus-visible:ring-[#5b8def]/45',
				collapsed ? 'mx-auto w-12 justify-center' : 'mx-2 px-2.5',
				'[@media(hover:hover)]:hover:bg-white/[0.035]'
			)}
		>
			{({ isActive }) => (
				<>
					{isActive &&
						(reduceMotion ? (
							<span className="absolute inset-0 rounded-[11px] border border-white/[0.09] bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]" />
						) : (
							<motion.span
								layoutId="sidebar-active-pill"
								className="absolute inset-0 rounded-[11px] border border-white/[0.09] bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
								transition={{ type: 'spring', bounce: 0, duration: 0.42 }}
							/>
						))}

					{item.icon && (
						<item.icon
							className={cn(
								'relative z-10 h-[18px] w-[18px] shrink-0 transition-colors duration-200',
								isActive ? 'text-[#9bbcff]' : 'text-white/38 group-hover:text-white/72'
							)}
							strokeWidth={isActive ? 2.2 : 1.9}
						/>
					)}

					<span
						className={cn(
							'relative z-10 overflow-hidden transition-all duration-300 ease-apple-out',
							!collapsed ? 'ml-2.5 max-w-40 opacity-100' : 'ml-0 max-w-0 opacity-0'
						)}
					>
						<span
							className={cn(
								'block whitespace-nowrap text-[12.5px] font-medium tracking-[-0.006em]',
								isActive ? 'text-white' : 'text-white/52 group-hover:text-white/82'
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
			transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.1, duration: 0.48 }}
			className="sidebar-material sticky top-0 z-40 flex h-full shrink-0 flex-col border-r border-white/[0.05]"
		>
			{/* Brand */}
			<div className={cn('flex h-[76px] items-center', collapsed ? 'justify-center px-3' : 'px-5')}>
				<Link
					to="/admin/dashboard"
					className="group relative flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#5b8def]/45"
					aria-label="SEATS dashboard"
				>
					<img
						src="/images/SBO_LOGO.jpg"
						alt=""
						className="h-9 w-9 max-w-none shrink-0 rounded-[11px] object-cover ring-1 ring-white/[0.12]"
					/>
					<span
						className={cn(
							'overflow-hidden whitespace-nowrap transition-all duration-300 ease-apple-out',
							collapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100'
						)}
					>
						<span className="block text-[14px] font-semibold leading-tight tracking-[-0.02em] text-[#f5f5f7]">
							SEATS
						</span>
						<span className="mt-0.5 block text-[9.5px] font-medium uppercase tracking-[0.1em] text-white/28">
							SBO Attendance
						</span>
					</span>
					{collapsed && <RailTooltip label="SEATS" />}
				</Link>
			</div>

			{/* Navigation */}
			<nav aria-label="Primary" className="flex-1 overflow-visible pb-3 pt-1">
				{NAV_SECTIONS.map((section, sectionIndex) => (
					<div key={section.label} className={cn(sectionIndex > 0 && 'mt-5')}>
						<div
							className={cn(
								'overflow-hidden transition-all duration-300 ease-apple-out',
								collapsed ? 'max-h-0 opacity-0' : 'max-h-6 opacity-100'
							)}
						>
							<p
								className={cn(
									'pb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/22',
									'px-[18px]'
								)}
							>
								{section.label}
							</p>
						</div>
						{!collapsed && <div className="mb-1.5 h-px bg-white/[0.035]" />}
						<div className={cn(collapsed ? 'space-y-1.5' : 'space-y-0.5')}>
							{section.items.map((item) => (
								<NavItem key={item.title} item={item} collapsed={collapsed} />
							))}
						</div>
					</div>
				))}
			</nav>

			{/* Footer */}
			<div className={cn('pb-4', collapsed ? 'px-2' : 'px-2.5')}>
				{!collapsed && (
					<div className="mb-2 rounded-xl border border-white/[0.055] bg-white/[0.022] px-3 py-2.5">
						<div className="flex items-center gap-1.5">
							<span className="h-[5px] w-[5px] rounded-full bg-[#43d7b0] shadow-[0_0_8px_rgba(67,215,176,0.5)]" />
							<p className="text-[10.5px] font-medium text-white/52">Local database</p>
						</div>
						<p className="mt-1 pl-[14px] text-[10px] leading-snug text-white/24">
							Attendance stays on this device.
						</p>
					</div>
				)}

				{collapsed && (
					<div className="group relative mb-2 flex h-9 items-center justify-center rounded-xl">
						<Database className="h-[17px] w-[17px] text-white/28" />
						<RailTooltip label="Local database · on this device" />
					</div>
				)}

				<button
					type="button"
					onClick={() => setCollapsed((value) => !value)}
					aria-pressed={collapsed}
					aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					className={cn(
						'group flex h-9 w-full items-center rounded-[11px] outline-none transition-[background-color,color] duration-150 ease-apple-out',
						'hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[#5b8def]/45',
						collapsed ? 'justify-center' : 'gap-2.5 px-3'
					)}
				>
					<CaretDoubleLeft
						className={cn(
							'h-4 w-4 shrink-0 text-white/32 transition-[color,transform] duration-300 ease-apple-out group-hover:text-white/65',
							collapsed && 'rotate-180'
						)}
					/>
					<span
						className={cn(
							'overflow-hidden whitespace-nowrap text-[11.5px] font-medium text-white/38 transition-all duration-300 ease-apple-out group-hover:text-white/65',
							collapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'
						)}
					>
						Collapse
					</span>
				</button>
			</div>
		</motion.aside>
	);
}
