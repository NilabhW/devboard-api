import axios from 'axios';

// Create an Axios instance
const axiosClient = axios.create({
  baseURL: 'http://localhost:3000/api', // Pointing to our DevBoard API
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add the Access Token to headers
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor to handle 401 errors and Token Refresh
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark to prevent infinite loops

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Request a new access token using the refresh token
        const response = await axios.post('http://localhost:3000/api/auth/refresh', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Save the new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update the authorization header for the failed request and retry it
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // If the refresh fails (e.g., refresh token is expired or blacklisted), log the user out
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // For other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default axiosClient;
