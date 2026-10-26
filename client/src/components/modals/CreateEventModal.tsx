import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import CreateEventForm from '../CreateEventForm';
import AppleModal from '../ui/AppleModal';

export default function CreateEventModal() {
	const [opened, setOpened] = useState(false);

	return (
		<>
			<button
				onClick={() => setOpened(true)}
				className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0a84ff] px-3.5 text-[12px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(10,132,255,0.7)] transition-[background-color,transform,box-shadow] duration-150 ease-apple-out hover:bg-[#3d9bff] active:scale-[0.97]"
			>
				<Plus className="w-4 h-4" />
				New Event
			</button>

			<AppleModal
				opened={opened}
				onClose={() => setOpened(false)}
				title="Create Event"
				subtitle="Add a new event to start tracking attendance"
				size="lg"
			>
				<CreateEventForm onSuccess={() => setOpened(false)} />
			</AppleModal>
		</>
	);
}
