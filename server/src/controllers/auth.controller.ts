import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { createUserSchema, loginSchema } from '../schemas/user.schema';
import appAssert from '../errors/app-assert';
import {
	BAD_REQUEST,
	CONFLICT,
	NO_CONTENT,
	OK,
	UNAUTHORIZED,
} from '../constants/http';
import { BCRYPT_SALT, JWT_REFRESH_SECRET_KEY } from '../constants/env';
import SessionModel from '../models/mongodb/session.model';
import UserModel from '../models/mongodb/user.model';
import { getUserRequestInfo } from '../utils/utils';
import { ONE_DAY_MS, thirtyDaysFromNow } from '../utils/date';
import {
	getAccessToken,
	RefreshTokenPayload,
	refreshTokenSignOptions,
	signToken,
	verifyToken,
} from '../utils/jwts';
import {
	cookieOptions,
	getAccessTokenOptions,
	getRefreshTokenOptions,
	REFRESH_PATH,
	setAuthCookie,
} from '../utils/cookie';
import CustomResponse from '../models/utils/response';
import {
	accessTokenCookieName,
	AppErrorCodes,
	refreshTokenCookieName,
} from '../constants';
import { verifyRecaptcha } from '../utils/recaptcha';

/**
 * @route POST /api/v1/auth/login - Login
 */
export const loginHandler = asyncHandler(async (req, res) => {
	const body = loginSchema.parse(req.body);
	const user = await UserModel.findOne({ email: body.email }).exec();

	// Check if user exists
	appAssert(user, UNAUTHORIZED, 'Incorrect email or password');

	// Check password
	const match = await bcrypt.compare(body.password, user.password);
	appAssert(match, UNAUTHORIZED, 'Incorrect email or password');

	const { ip, userAgent } = getUserRequestInfo(req);

	// Create session
	const session = await SessionModel.create({
		userID: user._id,
		expiresAt: thirtyDaysFromNow(),
		ip,
		userAgent,
	});

	const userID = user._id as string;
	const sessionID = session._id as string;

	// sign tokens
	const accessToken = signToken({ sessionID, userID });
	const refreshToken = signToken({ sessionID }, refreshTokenSignOptions);
	setAuthCookie({ res, accessToken, refreshToken });

	res.json(new CustomResponse(true, user.omitPassword(), 'Login successful'));
});

/**
 * @route POST /api/v1/auth/signup - Sign up
 */
export const signupHandler = asyncHandler(async (req, res) => {
	const body = createUserSchema.parse(req.body);

	// check for duplicate email
	const existingUser = await UserModel.findOne({ email: body.email });
	console.log(existingUser);
	appAssert(!existingUser, CONFLICT, 'Email already used');

	// Check if passwords match
	appAssert(
		body.password === body.confirmPassword,
		BAD_REQUEST,
		'Passwords do not match'
	);

	// Hash password
	const hashedPassword = await bcrypt.hash(
		body.password,
		parseInt(BCRYPT_SALT)
	);
	body.password = hashedPassword;

	// create user
	const user = await UserModel.create(body);

	res.json(new CustomResponse(true, user.omitPassword(), 'Signup successful'));
});

/**
 * @route GET /api/v1/auth/logout - Logout
 */
export const logoutHandler = asyncHandler(async (req, res) => {
	const accessToken = getAccessToken(req);

	// check if token is present
	appAssert(accessToken, NO_CONTENT, 'No token');

	const { payload } = verifyToken(accessToken);

	if (payload) {
		await SessionModel.findByIdAndDelete(payload.sessionID);
	}

	// clear the cookie
	res.clearCookie(accessTokenCookieName, cookieOptions);
	res.clearCookie(refreshTokenCookieName, {
		...cookieOptions,
		path: REFRESH_PATH,
	});

	res.sendStatus(OK);
});

/**
 * @route GET /api/v1/auth/refresh - Refresh token
 */
export const refreshTokenHandler = asyncHandler(async (req, res) => {
	// get the refresh token
	const refreshToken = req.cookies[refreshTokenCookieName] as string;
	appAssert(refreshToken, UNAUTHORIZED, 'No refresh token found');

	// verify the refresh token
	const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, {
		secret: JWT_REFRESH_SECRET_KEY,
	});

	appAssert(payload, UNAUTHORIZED, 'Token did not return any payload');

	const session = await SessionModel.findById(payload.sessionID);
	const now = Date.now();

	// check if session is valid
	appAssert(session, UNAUTHORIZED, 'Invalid session');

	// check if session is expired
	if (session.expiresAt.getTime() < now) {
		await SessionModel.findByIdAndDelete(session._id);
		appAssert(false, UNAUTHORIZED, 'Session expired');
	}

	// check if session needs refresh
	const sessionNeedsRefresh = session.expiresAt.getTime() - now < ONE_DAY_MS;
	if (sessionNeedsRefresh) {
		session.expiresAt = thirtyDaysFromNow();
		await session.save();
	}

	// create and set the new access token and refresh token
	const newRefreshToken = sessionNeedsRefresh
		? signToken({ sessionID: session._id as string }, refreshTokenSignOptions)
		: undefined;

	const accessToken = signToken({
		sessionID: session._id as string,
		userID: session.userID as unknown as string,
	});

	if (newRefreshToken) {
		res.cookie(
			refreshTokenCookieName,
			newRefreshToken,
			getRefreshTokenOptions()
		);
	}

	res
		.status(OK)
		.cookie(accessTokenCookieName, accessToken, getAccessTokenOptions())
		.json(new CustomResponse(true, null, 'Token refreshed'));
});

/**
 * @route POST /api/v1/token/verify
 */
export const verifyAuthHandler = asyncHandler(async (req, res) => {
	const token = getAccessToken(req);
	appAssert(
		token,
		UNAUTHORIZED,
		'Token not found',
		AppErrorCodes.InvalidAccessToken
	);

	// verify the token
	const { error, payload } = verifyToken(token);
	appAssert(
		!error && payload,
		UNAUTHORIZED,
		'Token not verified',
		AppErrorCodes.InvalidAccessToken
	);

	const user = await UserModel.findById(payload.userID as string);
	const session = await SessionModel.findById(payload.sessionID);

	appAssert(
		session && user,
		UNAUTHORIZED,
		'User or session not found',
		AppErrorCodes.InvalidAccessToken
	);

	const now = Date.now();

	if (session.expiresAt.getTime() < now) {
		await SessionModel.findByIdAndDelete(session._id);
		appAssert(
			false,
			UNAUTHORIZED,
			'Session expired',
			AppErrorCodes.InvalidAccessToken
		);
	}

	res.status(OK).json(user.omitPassword());
});

/**
 * @route POST /api/v1/auth/recaptcha/verify
 */
// DISABLED: recaptcha bypassed - always returns success
export const recaptchaVerify = asyncHandler(async (req, res) => {
	res.status(OK).json(new CustomResponse(true, null, 'Recaptcha verified (bypassed)'));
});
