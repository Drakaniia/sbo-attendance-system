import { motion, useReducedMotion } from 'framer-motion';
import Header from '../../components/ui/Header';
import { useSettingsActions } from '../../hooks/useSettingsActions';
import { AboutSection, DatabaseSection, DisplaySection, ResetDataModal } from './SettingsSections';

export default function Settings() {
	const reduceMotion = useReducedMotion();
	const {
		dbPath,
		backingUp,
		restoring,
		kioskEnabled,
		autoStartEnabled,
		version,
		resetOpen,
		setResetOpen,
		resetting,
		handleBackup,
		handleRestore,
		handleKioskToggle,
		handleAutoStartToggle,
		handleResetAll,
		handleCopyPath,
	} = useSettingsActions();

	return (
		<div className="flex flex-col gap-6 pb-8 -mx-5 -mt-5 px-5">
			{/* ── Sticky header ─────────────────────────── */}
			<header className="sticky -top-5 z-20 glass-heavy pt-5 pb-4 -mx-5 px-5">
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: 'spring',
						bounce: 0,
						duration: 0.4,
					}}
					className="min-w-0"
				>
					<Header className="!text-2xl !tracking-tight truncate">Settings</Header>
					<p className="text-white/40 text-sm mt-1 truncate">
						Manage your database, display preferences, and app information
					</p>
				</motion.div>
			</header>

			<DatabaseSection
				dbPath={dbPath}
				backingUp={backingUp}
				restoring={restoring}
				onCopyPath={handleCopyPath}
				onBackup={handleBackup}
				onRestore={handleRestore}
				onDeleteClick={() => setResetOpen(true)}
			/>
			<DisplaySection
				kioskEnabled={kioskEnabled}
				onKioskToggle={handleKioskToggle}
				autoStartEnabled={autoStartEnabled}
				onAutoStartToggle={handleAutoStartToggle}
			/>
			<AboutSection dbPath={dbPath} version={version} />
			<ResetDataModal
				open={resetOpen}
				resetting={resetting}
				onClose={() => !resetting && setResetOpen(false)}
				onConfirm={handleResetAll}
			/>
		</div>
	);
}
