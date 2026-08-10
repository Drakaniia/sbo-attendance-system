import axios, { type CreateAxiosDefaults } from 'axios';

const options: CreateAxiosDefaults = {
	baseURL: 'http://127.0.0.1:8000/api/v1',
	withCredentials: false,
};

const axiosInstance = axios.create(options);

// Response error interceptor — pass through error data in the
// { status, message, errorCode } shape the client already expects.
axiosInstance.interceptors.response.use(
	(response) => response,
	(error) => {
		const { response } = error;
		if (response?.data) {
			return Promise.reject({ status: response.status, ...response.data });
		}
		return Promise.reject({ status: 0, message: 'Network error' });
	}
);

export default axiosInstance;
