// NotificationProvider.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Notification } from '@mantine/core';

type NotificationData = {
	title: string;
	message?: string;
	duration?: number; // default 5000 ms
	icon?: React.ReactNode;
	color?: string;
};

type NotificationContextType = {
	showNotification: (data: NotificationData) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
	const [notification, setNotification] = useState<NotificationData | null>(null);

	const showNotification = (data: NotificationData) => {
		setNotification(data);
		const timeout = data.duration ?? 5000;
		setTimeout(() => setNotification(null), timeout);
	};

	const handleClose = () => setNotification(null);

	return (
		<NotificationContext.Provider value={{ showNotification }}>
			{children}
			{notification && (
				<div className="absolute bottom-3 left-3 z-50">
					{notification.icon ? (
						<Notification
							title={notification.title}
							onClose={handleClose}
							icon={notification.icon}
							color={notification.color}
							withCloseButton
						>
							{notification.message}
						</Notification>
					) : (
						<Notification
							title={notification.title}
							onClose={handleClose}
							color={notification.color}
							withCloseButton
						>
							{notification.message}
						</Notification>
					)}
				</div>
			)}
		</NotificationContext.Provider>
	);
};

// Hook + provider intentionally share this file (context must be co-located
// with the provider); the rule is about fast-refresh, not correctness.
// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
	const ctx = useContext(NotificationContext);
	if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
	return ctx.showNotification;
};
