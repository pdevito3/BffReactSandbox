// API utilities with CSRF protection
export const BFF_BASE_URL = "http://localhost:3118";

// CSRF header configuration
const CSRF_HEADER_NAME = "X-CSRF";
const CSRF_HEADER_VALUE = "1";

// HTTP methods that require CSRF protection
const STATEFUL_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Enhanced fetch wrapper that automatically includes CSRF headers for state-changing requests
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || "GET";

  // Prepare headers
  const headers = new Headers(options.headers || {});

  // Always include credentials for session cookies
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers,
  };

  // Add CSRF header for state-changing requests
  if (STATEFUL_METHODS.has(method)) {
    headers.set(CSRF_HEADER_NAME, CSRF_HEADER_VALUE);
  }

  // Add Content-Type if not already set and has body
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, fetchOptions);
}

/**
 * Helper for making GET requests to BFF endpoints
 */
export async function bffGet<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(`${BFF_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `GET ${endpoint} failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Helper for making POST requests to BFF endpoints
 */
export async function bffPost<T>(endpoint: string, body?: any): Promise<T> {
  const response = await apiFetch(`${BFF_BASE_URL}${endpoint}`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `POST ${endpoint} failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Helper for making PUT requests to BFF endpoints
 */
export async function bffPut<T>(endpoint: string, body?: any): Promise<T> {
  const response = await apiFetch(`${BFF_BASE_URL}${endpoint}`, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `PUT ${endpoint} failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Helper for making PATCH requests to BFF endpoints
 */
export async function bffPatch<T>(endpoint: string, body?: any): Promise<T> {
  const response = await apiFetch(`${BFF_BASE_URL}${endpoint}`, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `PATCH ${endpoint} failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Helper for making DELETE requests to BFF endpoints
 */
export async function bffDelete<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(`${BFF_BASE_URL}${endpoint}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      `DELETE ${endpoint} failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Generic API error handling utility
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

/**
 * Enhanced fetch that throws structured errors
 */
export async function fetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await apiFetch(url, options);

    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        `Request failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new Error(
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
