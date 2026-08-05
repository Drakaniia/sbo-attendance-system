declare module 'xlsx' {
	export interface WorkBook {
		SheetNames: string[];
		Sheets: { [sheet: string]: WorkSheet };
	}

	export interface WorkSheet {
		[key: string]: CellObject;
		'!ref'?: string;
	}

	export interface CellObject {
		t: string;
		v: string | number | boolean | Date;
		w?: string;
		r?: string;
		h?: string;
	}

	export interface JSON2SheetOpts {
		header?: string[];
		skipHeader?: boolean;
	}

	export interface Sheet2JSONOpts {
		raw?: boolean;
		range?: number;
		header?: string | string[];
		defval?: unknown;
		blankrows?: boolean;
	}

	export interface WritingOptions {
		type?: 'base64' | 'binary' | 'string' | 'buffer' | 'array' | 'file';
		bookType?: string;
		sheet?: string;
		bookSST?: boolean;
	}

	export interface ParsingOptions {
		type?: 'base64' | 'binary' | 'string' | 'buffer' | 'array' | 'file';
		raw?: boolean;
		codepage?: number;
	}

	export function read(data: Buffer | string, opts?: ParsingOptions): WorkBook;
	export function write(wb: WorkBook, opts?: WritingOptions): string | Buffer;

	export const utils: {
		sheet_to_json<T>(worksheet: WorkSheet, opts?: Sheet2JSONOpts): T[];
		json_to_sheet<T>(data: T[], opts?: JSON2SheetOpts): WorkSheet;
		book_new(): WorkBook;
		book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void;
		aoa_to_sheet(data: unknown[][], opts?: unknown): WorkSheet;
		sheet_add_aoa(ws: WorkSheet, data: unknown[][], opts?: unknown): WorkSheet;
		encode_cell(cell: { r: number; c: number }): string;
		decode_range(range: string): { s: { r: number; c: number }; e: { r: number; c: number } };
	};

	export default XLSX;
	declare const XLSX: {
		read: typeof read;
		write: typeof write;
		utils: typeof utils;
		version: string;
	};
}
