import 'dotenv/config';

const getEnv = (key: string, defaultValue?: string): string => {
	const value = process.env[key] || defaultValue;

	if (value === undefined) {
		throw new Error(`Environment variable ${key} is required`);
	}

	return value;
};

export const PORT = getEnv('PORT', '8000');
export const MONGO_URI = getEnv('MONGO_URI');
// DISABLED: auth bypassed - dummy defaults
export const JWT_REFRESH_SECRET_KEY = getEnv('JWT_REFRESH_SECRET_KEY', 'disabled');
export const JWT_SECRET_KEY = getEnv('JWT_SECRET_KEY', 'disabled');
export const BCRYPT_SALT = getEnv('BCRYPT_SALT', '10');
export const NODE_ENV = getEnv('NODE_ENV', 'development');
export const FRONTEND_URL = getEnv('FRONTEND_URL', 'http://localhost:5173');
// DISABLED: recaptcha bypassed - dummy defaults
export const RECAPTCHA_SITE_KEY = getEnv('RECAPTCHA_SITE_KEY', 'disabled');
export const RECAPTCHA_SECRET_KEY = getEnv('RECAPTCHA_SECRET_KEY', 'disabled');
