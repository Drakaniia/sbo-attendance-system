export default class CustomResponse {
	success: boolean;
	data: any;
	message: string;
	error?: string | undefined;

	constructor(
		success: boolean,
		data: any,
		message: string,
		error?: string | undefined
	) {
		this.success = success;
		this.data = data;
		this.message = message;
		this.error = error;
	}
}

export class CustomPaginatedResponse extends CustomResponse {
	next: number;
	prev: number;
	totalPages: number | undefined;
	total: number | undefined;

	constructor(
		success: boolean,
		data: any,
		message: string,
		next: number,
		prev: number,
		totalPages?: number,
		total?: number,
		error?: string | undefined
	) {
		super(success, data, message, error);
		this.next = next;
		this.prev = prev;
		this.totalPages = totalPages;
		this.total = total;
	}
}
