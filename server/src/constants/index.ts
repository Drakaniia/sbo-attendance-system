export const accessTokenCookieName = 'sbo_attendance_access_token';
export const refreshTokenCookieName = 'sbo_attendance_refresh_token';

export const DB_MODEL = {
	USER: 'User',
	STUDENT: 'Student',
	TRANSACTION: 'Transaction',
	ORGANIZATION: 'Organization',
	CATEGORY: 'Category',
	SESSION: 'Session',
};

export enum AppErrorCodes {
	InvalidAccessToken = 'InvalidAccessToken',
	AlreadyCheckedIn = 'AlreadyCheckedIn',
	AlreadyCheckedOut = 'AlreadyCheckedOut',
}
