import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
dotenv.config();

import connectToMongoDB from './database/mongodb';
import { notFoundHandler } from './middlewares/not-found';
import { errorHandler } from './middlewares/error';
import { healthcheck } from './middlewares/healthcheck';
import { corsOptions } from './utils/cors';
import { PORT } from './constants/env';

import authRouter from './routes/auth.route';
import studentRouter from './routes/student.route';
import eventRouter from './routes/event.route';
import attendanceRouter from './routes/attendance.route';
import dashboardRouter from './routes/dashboard.route';
// import { auth } from './middlewares/auth'; // DISABLED: auth bypassed
import { limiter } from './utils/rate-limiter';
import helmet from 'helmet';

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.get('/', healthcheck);

// Routes
app.use('/api/v1/auth', limiter, authRouter);
// app.use(auth); // DISABLED: auth bypassed
app.use('/api/v1/student', studentRouter);
app.use('/api/v1/event', eventRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, async () => {
	await connectToMongoDB();
	console.log(`Server is running on http://localhost:${PORT}`);
});
