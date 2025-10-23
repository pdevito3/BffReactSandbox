import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { ApiError, BFF_BASE_URL, myAppBff } from "../lib/api";

// Authentication types
export interface TokenInfo {
  accessTokenExpiresAt?: string;
  sessionExpiresAt?: string;
  sessionIssuedAt?: string;
}

export interface User {
  isAuthenticated: boolean;
  name?: string;
  email?: string;
  initials?: string;
  tokenInfo?: TokenInfo;
  claims?: Array<{
    type: string;
    value: string;
  }>;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  name?: string;
}

// API functions
async function fetchAuthStatus(): Promise<AuthStatus> {
  try {
    const response = await myAppBff.get<AuthStatus>("/status");
    return response.data;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return { isAuthenticated: false };
  }
}

async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await myAppBff.get<User>("/user");
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { isAuthenticated: false };
    }

    console.error("Error fetching user:", error);
    return null;
  }
}

// Authentication actions
export function login(returnUrl?: string) {
  // If no returnUrl provided, capture the current route
  const finalReturnUrl =
    returnUrl ||
    (() => {
      const currentPath =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      // Only preserve the path if we're not already on the login page
      return !currentPath.startsWith("/login") && currentPath !== "/"
        ? currentPath
        : undefined;
    })();

  const url = new URL(`${BFF_BASE_URL}/bff/login`);
  if (finalReturnUrl) {
    url.searchParams.set("returnUrl", finalReturnUrl);
  }
  window.location.href = url.toString();
}

export function logout(returnUrl?: string) {
  const url = new URL(`${BFF_BASE_URL}/bff/logout`);
  if (returnUrl) {
    url.searchParams.set("returnUrl", returnUrl);
  }
  window.location.href = url.toString();
}

// Refresh current user's tokens
export async function refreshTokens(): Promise<{
  success: boolean;
  message?: string;
  expiresAt?: string;
}> {
  try {
    const response = await myAppBff.post<{
      success: boolean;
      message?: string;
      expiresAt?: string;
    }>("/refresh");
    return response.data;
  } catch (error) {
    console.error("Error refreshing tokens:", error);

    if (error instanceof ApiError) {
      return {
        success: false,
        message: `Token refresh failed: ${error.status} ${error.statusText}`,
      };
    }

    return {
      success: false,
      message: "Network error during token refresh",
    };
  }
}

// Query keys
const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
  status: () => [...authKeys.all, "status"] as const,
};

// Main auth hook
export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    error,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: authKeys.user(),
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (unauthorized)
      if (error instanceof Error && error.message.includes("401")) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const invalidateAuth = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: authKeys.all });
  }, [queryClient]);

  const refreshAuth = useCallback(() => {
    return refetch();
  }, [refetch]);

  const refreshTokensMutation = useMutation({
    mutationFn: refreshTokens,
    onSuccess: () => {
      // Invalidate and refetch user data after successful token refresh
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      queryClient.invalidateQueries({ queryKey: authKeys.status() });
      refetch();
    },
    onError: (error) => {
      console.error("Token refresh failed:", error);
    },
  });

  return {
    user,
    loading,
    error: error?.message ?? null,
    isAuthenticated: user?.isAuthenticated ?? false,
    userInitials: user?.initials ?? "U",
    userName: user?.name,
    userEmail: user?.email,
    refetch: refreshAuth,
    invalidateAuth,
    refreshTokens: refreshTokensMutation,
    login,
    logout,
  };
}

// Lightweight auth status hook
export function useAuthStatus() {
  const {
    data: status,
    error,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: authKeys.status(),
    queryFn: fetchAuthStatus,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  return {
    ...status,
    isAuthenticated: status?.isAuthenticated ?? false,
    loading,
    error: error?.message ?? null,
    refetch,
  };
}
