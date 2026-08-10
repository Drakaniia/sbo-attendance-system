import { AnimatePresence, motion } from 'framer-motion';
import { Warning, X } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import type { ScanFeedback } from '../../types/event';

type ScanFeedbackOverlayProps = {
	feedback: ScanFeedback | null;
	reduceMotion: boolean | null;
};

export default function ScanFeedbackOverlay({ feedback, reduceMotion }: ScanFeedbackOverlayProps) {
	return (
		<AnimatePresence>
			{feedback && feedback.type !== 'success' && (
				<motion.div
					role={feedback.type === 'error' ? 'alert' : 'status'}
					className={cn(
						'fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-[2px] pointer-events-none',
						feedback.type === 'error' ? 'bg-red-500/10' : 'bg-amber-500/10'
					)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
				>
					<motion.div
						className={cn(
							'flex flex-col items-center gap-3 rounded-2xl px-12 py-9 border',
							feedback.type === 'error'
								? 'border-red-500/30 bg-red-500/[0.08]'
								: 'border-amber-500/30 bg-amber-500/[0.08]'
						)}
						initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4 }}
						animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
						exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4 }}
						transition={
							reduceMotion ? { duration: 0.1 } : { type: 'spring', bounce: 0, duration: 0.3 }
						}
					>
						<div
							className={cn(
								'flex items-center justify-center w-14 h-14 rounded-full',
								feedback.type === 'error' ? 'bg-red-500/15' : 'bg-amber-500/15'
							)}
						>
							{feedback.type === 'error' ? (
								<X className="w-7 h-7 text-red-400" />
							) : (
								<Warning className="w-7 h-7 text-amber-400" />
							)}
						</div>
						<p className="text-white font-semibold text-lg">{feedback.message}</p>
						<p className="font-mono text-sm text-white/50">ID: {feedback.studentID}</p>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
