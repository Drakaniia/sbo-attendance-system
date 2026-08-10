import { Input, InputLabel } from '@mantine/core';
import {
	type FieldErrors,
	type FieldValues,
	type Path,
	type UseFormRegister,
} from 'react-hook-form';

interface InputFieldProps<T extends FieldValues> {
	label: string;
	name: Path<T>;
	registerFn: UseFormRegister<T>;
	errors: FieldErrors<T>;
	type?: React.HTMLInputTypeAttribute | undefined;
	placeholder?: string;
	id: string;
	onChange?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	autoComplete?: boolean;
	isDisabled?: boolean;
}

export default function InputField<T extends FieldValues>({
	placeholder,
	registerFn,
	name,
	label,
	id,
	type,
	errors,
	onChange,
	autoComplete = true,
	isDisabled = false,
}: InputFieldProps<T>) {
	return (
		<div className="space-y-1 text-muted-foreground w-full">
			<InputLabel htmlFor={id}>{label}</InputLabel>
			<Input
				disabled={isDisabled}
				{...registerFn(name)}
				type={type}
				autoComplete={autoComplete ? 'on' : 'off'}
				// onChange={onChange}
				onKeyDownCapture={onChange}
				id={id}
				placeholder={placeholder}
			/>
			{errors[name] && errors[name].message && (
				<p className="text-xs text-red-500">{errors[name].message.toString()}</p>
			)}
		</div>
	);
}
