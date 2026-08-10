import type { Event } from '../types/event';
import axiosInstance from './axios-instance';

export const fetchEvents = async (): Promise<Event[]> => {
	try {
		const { data } = await axiosInstance.get('/event');

		return data.data;
	} catch (error) {
		console.error('Failed to fetch events', error);
		throw error;
	}
};

export const fetchSingleEvent = async (eventID: string): Promise<Event> => {
	try {
		const { data } = await axiosInstance.get(`/event/${eventID}`);

		return data.data;
	} catch (error) {
		console.error('Failed to fetch single event', error);
		throw error;
	}
};
