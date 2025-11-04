import axios from "axios";
import { Notification } from "./notification";

// API utilities with CSRF protection
export const BFF_BASE_URL = "https://localhost:3118";

/**
 * Get the login URL
 */
export function getLoginUrl() {
  return `/bff/login`;
}

/**
 * BFF axios instance
 */
export const myAppBff = axios.create({
  baseURL: BFF_BASE_URL + "/bff",
  headers: {
    "X-CSRF": "1",
  },
  withCredentials: true,
});

/**
 * API axios instance (if you have direct API calls)
 */
export const myAppApi = axios.create({
  baseURL: BFF_BASE_URL + "/api",
  headers: {
    "X-CSRF": "1",
  },
  withCredentials: true,
});

/**
 * Common error handler for all API responses
 */
function commonRejection(error: any) {
  // Handle 401 Unauthorized - redirect to login with current page for return
  if (error?.response?.status === 401) {
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    login(currentPath);
    return;
  }

  // Extract error details
  const statusCode = error?.response?.status;
  const detailMessage =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    "An unknown error occurred.";

  // Show notifications for specific error codes
  if (statusCode === 422 || statusCode === 400 || statusCode === 500) {
    Notification.error(`${detailMessage}`);
  }

  // Always throw the error so calling code can handle it
  throw error;
}

/**
 * Response interceptor for BFF
 */
myAppBff.interceptors.response.use(
  (response) => response,
  async (error) => {
    commonRejection(error);
  }
);

/**
 * Response interceptor for API
 */
myAppApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    commonRejection(error);
  }
);

/**
 * Generic API error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
