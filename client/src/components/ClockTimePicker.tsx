import { TimePicker } from '@mantine/dates';
import '@mantine/dates/styles.css';

const pad = (n: number) => n.toString().padStart(2, '0');

type ClockTimePickerProps = {
	label: string;
	value: Date | null;
	onChange: (date: Date) => void;
};

/** Date -> "HH:mm" string, the internal value format TimePicker expects. */
function toTimeString(date: Date | null): string {
	if (!date) return '';
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "HH:mm" string -> Date, keeping the date part of the previous value (or today). */
function fromTimeString(time: string, prev: Date | null): Date {
	const [h, m] = time.split(':').map(Number);
	const date = prev ? new Date(prev) : new Date();
	date.setHours(h || 0, m || 0, 0, 0);
	return date;
}

export default function ClockTimePicker({ label, value, onChange }: ClockTimePickerProps) {
	return (
		<TimePicker
			label={label}
			format='12h'
			value={toTimeString(value)}
			onChange={(time) => {
				if (!time) return;
				onChange(fromTimeString(time, value));
			}}
		/>
	);
}
