import { format } from 'date-fns';
import Header from '../../components/ui/Header';
import LiveClock from '../../components/LiveClock';

export default function DashboardHeader() {
	return (
		<header className='sticky -top-5 z-20 glass-heavy pt-5 pb-4 -mx-5 px-5'>
		<div className='flex items-center justify-between gap-4'>
			<div className='min-w-0'>
				<Header className='!text-2xl !tracking-tight truncate'>
					Dashboard Overview
				</Header>
				<p className='text-white/40 text-sm mt-1 truncate'>
					{format(new Date(), 'EEEE, MMMM d, yyyy')} — Real-time
					attendance insights
				</p>
			</div>
			<div className='hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-white/60'>
					<span className='relative flex w-2 h-2'>
						<span className='absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping' />
						<span className='relative inline-flex w-2 h-2 rounded-full bg-emerald-400' />
					</span>
					<LiveClock
						format='12'
						showSeconds
						className='tabular-nums text-white/60'
					/>
				</div>
			</div>
		</header>
	);
}
