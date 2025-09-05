import axios, { AxiosResponse } from 'axios';
import { ApiError } from '../types/index';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5099';
// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Allow self-signed certificates in development
  ...(process.env.NODE_ENV === 'development' && {
    httpsAgent: undefined,
  }),
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      details: error.response?.data?.details || error.response?.statusText,
      statusCode: error.response?.status,
    };

    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      apiError.message = 'Unable to connect to server. Please check if the backend is running on https://localhost:7189';
    }

    // Handle CORS errors
    if (error.message.includes('CORS')) {
      apiError.message = 'CORS error: Please ensure the backend allows requests from http://localhost:3000';
    }

    // Handle auth errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(apiError);
  }
);

export { api };

// Generic API methods
export const apiService = {
  get: <T>(url: string): Promise<T> => 
    api.get<T>(url).then(response => response.data),
    
  post: <T>(url: string, data?: any): Promise<T> => 
    api.post<T>(url, data).then(response => response.data),
    
  put: <T>(url: string, data?: any): Promise<T> => 
    api.put<T>(url, data).then(response => response.data),
    
  delete: <T>(url: string): Promise<T> => 
    api.delete<T>(url).then(response => response.data),
};

export default api;
