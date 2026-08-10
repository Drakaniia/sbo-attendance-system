import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

type HeaderSize = 'lg' | 'md' | 'sm';

type HeaderProps = PropsWithChildren & {
	size?: HeaderSize;
	className?: string;
};

export default function Header({ children, size = 'lg', className }: HeaderProps) {
	return (
		<>
			{size === 'lg' && (
				<h1 className={cn('text-3xl font-bold tracking-[-0.02em] leading-tight', className)}>
					{children}
				</h1>
			)}
			{size === 'md' && (
				<h1 className={cn('text-2xl font-bold tracking-[-0.01em] leading-snug', className)}>
					{children}
				</h1>
			)}
			{size === 'sm' && (
				<h1 className={cn('text-xl font-bold tracking-normal leading-snug', className)}>
					{children}
				</h1>
			)}
		</>
	);
}
