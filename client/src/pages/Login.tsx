import { Button } from '@mantine/core';
import { useForm } from 'react-hook-form';
import type z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../lib/validations/loginSchema';
import InputField from '../components/InputField';
import axiosInstance from '../api/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/ui/header';
import { useNotification } from '../hooks/useNotification';
import type { User } from '../types/user';
import type { APIResponse } from '../types/api-response';
// import Recaptcha from '../components/Recaptcha'; // DISABLED: recaptcha bypassed

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
	const notification = useNotification();
	const navigate = useNavigate();
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
	});

	const onSubmit = async (formData: LoginFormValues) => {
		try {
			const { data } = await axiosInstance.post<APIResponse<User>>(
				'/auth/login',
				formData
			);
			console.log(data);
			notification({
				title: `Hello there, ${data.data.firstname}!`,
				message: '',
			});
			navigate('/admin/dashboard');
		} catch (error) {
			console.log(error);
			setError('root', { message: 'Invalid email or password' });
		}
	};

	return (
		<div className='min-h-screen flex items-center justify-center'>
			<form onSubmit={handleSubmit(onSubmit)} className='space-y-2 w-[400px]'>
				<Header>Login</Header>
				<InputField<LoginFormValues>
					name='email'
					id='email'
					label='Email:'
					type='email'
					registerFn={register}
					errors={errors}
				/>
				<InputField<LoginFormValues>
					name='password'
					id='password'
					label='Password:'
					type='password'
					registerFn={register}
					errors={errors}
				/>
				{errors.root && (
					<p className='text-xs text-red-500'>{errors.root.message}</p>
				)}
				<p className='text-xs'>
					Don&apos;t have an account?
					<Link to='/signup' className='text-blue-500'>
						{' '}
						Signup
					</Link>
				</p>
				<div className='flex justify-end gap-2'>
					{/* <Recaptcha onVerify={setRecaptchaToken} /> DISABLED: recaptcha bypassed */}
					<Button disabled={isSubmitting} type='submit'>
						Submit
					</Button>
				</div>
			</form>
		</div>
	);
}
