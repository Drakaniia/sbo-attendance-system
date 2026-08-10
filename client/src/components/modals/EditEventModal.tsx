import { useState } from 'react';
import { PencilSimple } from '@phosphor-icons/react';
import CreateEventForm from '../CreateEventForm';
import AppleModal from '../ui/AppleModal';
import type { Event } from '../../types/event';

type EditEventModalProps = {
	event: Event;
};

export default function EditEventModal({ event }: EditEventModalProps) {
	const [opened, setOpened] = useState(false);

	return (
		<>
			<button
				type='button'
				onClick={() => setOpened(true)}
				aria-label='Edit event'
				title='Edit event'
				className='group/btn p-2 rounded-full text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors active:bg-white/[0.12]'
			>
				<PencilSimple className='w-4 h-4 transition-transform duration-150 ease-apple-out group-active/btn:scale-90' />
			</button>

			<AppleModal
				opened={opened}
				onClose={() => setOpened(false)}
				title='Edit Event'
				subtitle={event.title}
				size='lg'
			>
				<CreateEventForm event={event} onSuccess={() => setOpened(false)} />
			</AppleModal>
		</>
	);
}
