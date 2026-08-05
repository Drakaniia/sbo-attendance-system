export type APIResponse<T> = {
	success: boolean;
	data: T;
	message: string;
	error?: string;
};

export type APIPaginatedResponse<T> = APIResponse<T> & {
	next: number;
	prev: number;
	totalPages: number;
	total: number;
};
