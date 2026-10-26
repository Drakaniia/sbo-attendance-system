import PageHeader from '../../components/ui/PageHeader';
import { useSettingsActions } from '../../hooks/useSettingsActions';
import { AboutSection, DatabaseSection, DisplaySection, ResetDataModal } from './SettingsSections';

export default function Settings() {
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
		<div className="flex flex-col gap-5 pb-4">
			<PageHeader
				eyebrow="System"
				title="Settings"
				description="The database, the desk, and everything this device remembers."
				actions={
					<span className="control h-8 px-2.5 text-[11px] tabular-nums text-white/38">
						SEATS v{version}
					</span>
				}
			/>

			<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
				<DatabaseSection
					dbPath={dbPath}
					backingUp={backingUp}
					restoring={restoring}
					onCopyPath={handleCopyPath}
					onBackup={handleBackup}
					onRestore={handleRestore}
					onDeleteClick={() => setResetOpen(true)}
				/>
				<div className="space-y-5">
					<DisplaySection
						kioskEnabled={kioskEnabled}
						onKioskToggle={handleKioskToggle}
						autoStartEnabled={autoStartEnabled}
						onAutoStartToggle={handleAutoStartToggle}
					/>
					<AboutSection dbPath={dbPath} version={version} />
				</div>
			</div>
			<ResetDataModal
				open={resetOpen}
				resetting={resetting}
				onClose={() => !resetting && setResetOpen(false)}
				onConfirm={handleResetAll}
			/>
		</div>
	);
}
