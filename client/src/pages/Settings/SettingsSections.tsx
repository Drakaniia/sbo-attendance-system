import {
	Database,
	DownloadSimple,
	HardDrive,
	Info,
	Desktop,
	TrashSimple,
	UploadSimple,
	Warning,
} from '@phosphor-icons/react';
import AppleModal from '../../components/ui/AppleModal';
import {
	ActionButton,
	InfoRow,
	Section,
	SectionLabel,
	ToggleSwitch,
} from './SettingsUI';

/* ── Card stagger delays (ms) ──────────────────────── */
const CARD_DELAYS = [0, 80, 160];

/* ── Database section ──────────────────────────────── */

type DatabaseSectionProps = {
	dbPath: string;
	backingUp: boolean;
	restoring: boolean;
	onCopyPath: () => void;
	onBackup: () => void;
	onRestore: () => void;
	onDeleteClick: () => void;
};

export function DatabaseSection({
	dbPath,
	backingUp,
	restoring,
	onCopyPath,
	onBackup,
	onRestore,
	onDeleteClick,
}: DatabaseSectionProps) {
	return (
		<Section delay={CARD_DELAYS[0]}>
			<SectionLabel icon={Database} label='Database' />

			<div className='space-y-1 mb-5'>
				<InfoRow
					icon={HardDrive}
					label='Database location'
					value={dbPath}
					mono
					action={{ label: 'Copy', onClick: onCopyPath }}
				/>
			</div>

			<div className='space-y-2'>
				<ActionButton
					icon={DownloadSimple}
					label='Backup database'
					subtitle='Save a copy of the database to your computer'
					onClick={onBackup}
					loading={backingUp}
				/>
				<ActionButton
					icon={UploadSimple}
					label='Restore database'
					subtitle='Replace the current database with a backup file'
					onClick={onRestore}
					loading={restoring}
					color='danger'
				/>
				<ActionButton
					icon={TrashSimple}
					label='Delete all data'
					subtitle='Remove all students, events, and attendance records — start fresh'
					onClick={onDeleteClick}
					color='danger'
				/>

				{/* Restore warning */}
				<p className='flex items-start gap-2 pt-1 text-xs text-amber-400/60'>
					<Warning className='w-3.5 h-3.5 shrink-0 mt-px' />
					<span>
						Restoring will replace all current data. Make a
						backup first.
					</span>
				</p>
			</div>
		</Section>
	);
}

/* ── Display section ───────────────────────────────── */

type DisplaySectionProps = {
	kioskEnabled: boolean;
	onKioskToggle: (enabled: boolean) => void;
};

export function DisplaySection({ kioskEnabled, onKioskToggle }: DisplaySectionProps) {
	return (
		<Section delay={CARD_DELAYS[1]}>
			<SectionLabel icon={Desktop} label='Display' />

			<div className='flex items-center justify-between gap-4'>
				<div>
					<p className='text-sm font-medium text-white/70'>
						Kiosk mode
					</p>
					<p className='mt-0.5 text-xs text-white/35'>
						Fullscreen the window for event-day use. Press
						Escape to exit.
					</p>
				</div>
				<ToggleSwitch
					checked={kioskEnabled}
					onChange={onKioskToggle}
				/>
			</div>
		</Section>
	);
}

/* ── About section ─────────────────────────────────── */

type AboutSectionProps = {
	dbPath: string;
	version: string;
};

export function AboutSection({ dbPath, version }: AboutSectionProps) {
	return (
		<Section delay={CARD_DELAYS[2]}>
			<SectionLabel icon={Info} label='About' />

			<div className='space-y-1'>
				<InfoRow
					icon={Database}
					label='Application'
					value={`SEATS v${version}`}
				/>
				<InfoRow
					icon={HardDrive}
					label='Data directory'
					value={dbPath.replace(/[/\\\\][^/\\\\]+$/, '')}
					mono
				/>
				<InfoRow
					icon={Desktop}
					label='Platform'
					value='Windows desktop (Tauri)'
				/>
			</div>

			{/* App description */}
			<p className='mt-4 pt-4 border-t border-white/[0.06] text-xs text-white/25 leading-relaxed'>
				SEATS — SBO Attendance System. A fully offline desktop
				application for managing event attendance with USB barcode
				scanner support.
			</p>
		</Section>
	);
}

/* ── Delete-all confirmation modal ─────────────────── */

type ResetDataModalProps = {
	open: boolean;
	resetting: boolean;
	onClose: () => void;
	onConfirm: () => void;
};

export function ResetDataModal({
	open,
	resetting,
	onClose,
	onConfirm,
}: ResetDataModalProps) {
	return (
		<AppleModal
			opened={open}
			onClose={onClose}
			title='Delete all data?'
			subtitle='This cannot be undone'
			size='sm'
		>
			<div className='flex flex-col gap-4'>
				<p className='text-sm text-white/60 leading-relaxed'>
					This will permanently remove every student, event, and
					attendance record from this device.
				</p>

				<div className='rounded-xl bg-red-500/[0.06] border border-red-400/20 p-4'>
					<div className='flex items-start gap-2'>
						<Warning className='w-4 h-4 text-red-400/80 shrink-0 mt-px' />
						<p className='text-xs text-red-300/70 leading-relaxed'>
							Your app preferences are kept.
							If you might need this data later, make a backup
							first.
						</p>
					</div>
				</div>

				<div className='flex items-center justify-end gap-2.5 pt-1'>
					<button
						type='button'
						onClick={onClose}
						disabled={resetting}
						className='px-4 py-2 rounded-full text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40'
					>
						Cancel
					</button>
					<button
						type='button'
						onClick={onConfirm}
						disabled={resetting}
						className='inline-flex items-center gap-2 rounded-full bg-red-500 hover:bg-red-400 disabled:bg-white/[0.08] disabled:text-white/30 text-white text-sm font-semibold px-4 py-2 transition-[background-color,transform] duration-150 ease-apple-out active:scale-[0.97] disabled:active:scale-100'
					>
						{resetting && (
							<TrashSimple className='w-3.5 h-3.5 animate-spin' />
						)}
						{resetting ? 'Deleting…' : 'Delete everything'}
					</button>
				</div>
			</div>
		</AppleModal>
	);
}
