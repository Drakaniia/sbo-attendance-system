import {
	BarChart3,
	CalendarDays,
	GraduationCap,
	LayoutDashboard,
	Settings,
} from 'lucide-react';

export type SidebarItem = {
	title: string;
	path: string;
	icon: React.ElementType;
};

export type NavSection = {
	label: string;
	items: SidebarItem[];
};

export const NAV_SECTIONS: NavSection[] = [
	{
		label: 'Overview',
		items: [{ title: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard }],
	},
	{
		label: 'Manage',
		items: [
			{ title: 'Events', path: '/admin/events', icon: CalendarDays },
			{ title: 'Students', path: '/admin/students', icon: GraduationCap },
		],
	},
	{
		label: 'Insights',
		items: [{ title: 'Reports', path: '/admin/reports', icon: BarChart3 }],
	},
	{
		label: 'System',
		items: [{ title: 'Settings', path: '/admin/settings', icon: Settings }],
	},
];

/** Public API — flat list of every admin nav item. */
export const adminSidebarItems = NAV_SECTIONS.flatMap((s) => s.items);
