import type { Event } from '../types/event';
import { ipc } from '../lib/ipc';

/** Payload for creating / updating an event (matches `EventPayload`). */
export type EventPayload = {
	title: string;
	description: string;
	type: string;
	venue: string;
	startTime: string;
	endTime: string;
};

export const fetchEvents = async (): Promise<Event[]> => {
	try {
		return await ipc<Event[]>('list_events');
	} catch (error) {
		console.error('Failed to fetch events', error);
		throw error;
	}
};

export const fetchSingleEvent = async (eventID: string): Promise<Event> => {
	try {
		return await ipc<Event>('get_event', { eventId: eventID });
	} catch (error) {
		console.error('Failed to fetch single event', error);
		throw error;
	}
};

export const createEvent = async (payload: EventPayload): Promise<Event> => {
	return ipc<Event>('create_event', { payload });
};

export const updateEvent = async (eventID: string, payload: EventPayload): Promise<Event> => {
	return ipc<Event>('update_event', { eventId: eventID, payload });
};

export const archiveEvent = async (eventID: string): Promise<Event> => {
	return ipc<Event>('archive_event', { eventId: eventID });
};

export const unarchiveEvent = async (eventID: string): Promise<Event> => {
	return ipc<Event>('unarchive_event', { eventId: eventID });
};
