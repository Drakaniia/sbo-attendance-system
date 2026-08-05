import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createEventSchema } from '../../lib/validations/eventSchema';
import type z from 'zod';
import InputField from '../InputField';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useNotification } from '../../hooks/useNotification';
import { queryClient } from '../../main';
import { QUERY_KEYS } from '../../constants';
import type { Event } from '../../types/event';
import ClockTimePicker from '../ClockTimePicker';
import { CalendarClock } from 'lucide-react';

type EventFormValues = z.infer<typeof createEventSchema>;

type CreateEventFormProps = {
	event?: Event;
	onSuccess?: () => void;
};

/** Convert a local Date to the "YYYY-MM-DD" string format DatePickerInput expects. */
function toDateString(date: Date | null): string | null {
	if (!date) return null;
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** Parse the "YYYY-MM-DD" string from DatePickerInput, keeping the time of the previous value. */
function withTime(dateString: string | null, prev: Date | null): Date | null {
	if (!dateString) return null;
	const [y, m, d] = dateString.split('-').map(Number);
	const date = new Date(y, m - 1, d);
	if (prev) {
		date.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
	}
	return date;
}

export default function CreateEventForm({
	event,
	onSuccess,
}: CreateEventFormProps) {
	const notification = useNotification();
	const [startTime, setStartTime] = useState<Date | null>(new Date());
	const [endTime, setEndTime] = useState<Date | null>(null);

	const {
		handleSubmit,
		register,
		setError,
		setValue,
		reset,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: zodResolver(createEventSchema),
	});

	useEffect(() => {
		if (event) {
			setValue('title', event.title);
			setValue('description', event.description);
			setValue('type', event.type);
			setValue('venue', event.venue);
			setStartTime(new Date(event.startTime));
			setEndTime(new Date(event.endTime));
		}
	}, [event, setValue]);

	const onSubmit = async (formData: EventFormValues) => {
		try {
			if (!startTime || !endTime) {
				setError('root', { message: 'Start and end time are required' });
				return;
			}

			const body = {
				...formData,
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
			};

			const { data } = event
				? await axiosInstance.put(`/event/${event._id}`, body)
				: await axiosInstance.post('/event', body);

			notification({
				title: data.message,
				message: '',
			});

			await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENTS] });
			if (!event) {
				reset();
				setEndTime(null);
			}
			onSuccess?.();
		} catch (error) {
			console.error('Failed to create event', error);
			const message =
				error instanceof Error ? error.message : 'Failed to create event';
			setError('root', { message });
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
			<InputField<EventFormValues>
				name='title'
				id='title'
				label='Event Title'
				registerFn={register}
				errors={errors}
				placeholder='e.g. COT General Assembly'
			/>
			<InputField<EventFormValues>
				name='description'
				id='description'
				label='Event Description'
				registerFn={register}
				errors={errors}
				placeholder='What is this event about?'
			/>

			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<InputField<EventFormValues>
					name='type'
					id='type'
					label='Event Type'
					registerFn={register}
					errors={errors}
					placeholder='e.g. Seminar'
				/>
				<InputField<EventFormValues>
					name='venue'
					id='venue'
					label='Venue'
					registerFn={register}
					errors={errors}
					placeholder='e.g. COT Auditorium'
				/>
			</div>

			<div className='pt-1'>
				<p className='flex items-center gap-2 text-[11px] font-semibold text-white/40 uppercase tracking-micro mb-3'>
					<CalendarClock className='w-3.5 h-3.5' />
					Schedule
				</p>
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
					<div className='space-y-4'>
						<DatePickerInput
							clearable
							label='Start date'
							placeholder='Pick start date'
							value={toDateString(startTime)}
							onChange={(value) => setStartTime((prev) => withTime(value, prev))}
						/>
						<ClockTimePicker
							label='Start time'
							value={startTime}
							onChange={setStartTime}
						/>
					</div>
					<div className='space-y-4'>
						<DatePickerInput
							clearable
							label='End date'
							placeholder='Pick end date'
							value={toDateString(endTime)}
							onChange={(value) => setEndTime((prev) => withTime(value, prev))}
						/>
						<ClockTimePicker
							label='End time'
							value={endTime}
							onChange={setEndTime}
						/>
					</div>
				</div>
			</div>

			{errors.root && (
				<p className='text-xs text-red-400'>{errors.root.message}</p>
			)}

			<button
				type='submit'
				disabled={isSubmitting}
				className='w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 shadow-lg shadow-blue-500/25 transition-[background-color,transform,box-shadow] duration-150 ease-apple-out active:scale-[0.97]'
			>
				{isSubmitting ? 'Saving…' : event ? 'Save Changes' : 'Create Event'}
			</button>
		</form>
	);
}
