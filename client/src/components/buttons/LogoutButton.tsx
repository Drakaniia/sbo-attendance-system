import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { LogOut } from 'lucide-react';
import RailTooltip from '../RailTooltip';
import { cn } from '../../lib/utils';

type LogoutButtonProps = {
	collapsed?: boolean;
};

export default function LogoutButton({ collapsed = false }: LogoutButtonProps) {
	const navigate = useNavigate();

	const onLogout = async () => {
		try {
			await axiosInstance.get('/auth/logout');
			localStorage.removeItem('accessToken');
			navigate('/login');
		} catch {
			console.error('Failed to logout');
		}
	};

	return (
		<button
			onClick={onLogout}
			className={cn(
				'group relative flex h-10 w-full items-center rounded-xl outline-none transition-[background-color,transform] duration-150 ease-apple-out focus-visible:ring-2 focus-visible:ring-red-400/50 active:scale-[0.97] [@media(hover:hover)]:hover:bg-red-400/[0.08]',
				!collapsed && 'px-3',
				collapsed && 'justify-center px-0'
			)}
		>
			<LogOut className='relative z-10 h-5 w-5 shrink-0 text-white/45 transition-colors duration-200 group-hover:text-red-400' />
			<span
				className={cn(
					'relative z-10 overflow-hidden transition-all duration-300 ease-apple-out',
					!collapsed ? 'ml-3 max-w-40 opacity-100' : 'ml-0 max-w-0 opacity-0'
				)}
			>
				<span className='block whitespace-nowrap text-[13px] font-medium text-white/55 transition-colors group-hover:text-red-400'>
					Logout
				</span>
			</span>
			{collapsed && <RailTooltip label='Logout' />}
		</button>
	);
}
