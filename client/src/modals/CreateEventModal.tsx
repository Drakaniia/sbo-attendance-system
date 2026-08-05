import { useState } from 'react';
import { Plus } from 'lucide-react';
import CreateEventForm from '../components/forms/CreateEventForm';
import AppleModal from '../components/ui/AppleModal';

export default function CreateEventModal() {
	const [opened, setOpened] = useState(false);

	return (
		<>
			<button
				onClick={() => setOpened(true)}
				className='inline-flex items-center gap-2 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 shadow-lg shadow-blue-500/25 transition-[background-color,transform,box-shadow] duration-150 ease-apple-out active:scale-[0.97]'
			>
				<Plus className='w-4 h-4' />
				New Event
			</button>

			<AppleModal
				opened={opened}
				onClose={() => setOpened(false)}
				title='Create Event'
				subtitle='Add a new event to start tracking attendance'
				size='lg'
			>
				<CreateEventForm onSuccess={() => setOpened(false)} />
			</AppleModal>
		</>
	);
}
