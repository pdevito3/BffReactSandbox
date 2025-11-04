import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { ApiError, myAppBff } from "../lib/api";

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
    // Duende BFF doesn't have a separate /status endpoint
    // Use /user endpoint but only return authentication status
    const response = await myAppBff.get<BffClaim[]>("/user");
    const claims = response.data;
    const name =
      claims.find((c) => c.type === "name")?.value ||
      claims.find((c) => c.type === "preferred_username")?.value;
    return { isAuthenticated: true, name };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { isAuthenticated: false };
    }
    console.error("Error checking auth status:", error);
    return { isAuthenticated: false };
  }
}

// Duende BFF returns claims in this format
interface BffClaim {
  type: string;
  value: string;
}

async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await myAppBff.get<BffClaim[]>("/user");
    const claims = response.data;

    // Helper to get claim value
    const getClaim = (type: string): string | undefined =>
      claims.find((c) => c.type === type)?.value;

    // Extract user info from claims
    const name = getClaim("name") || getClaim("preferred_username");
    const email = getClaim("email");
    const givenName = getClaim("given_name");
    const familyName = getClaim("family_name");

    // Generate initials
    let initials = "U";
    if (givenName && familyName) {
      initials = `${givenName[0]}${familyName[0]}`.toUpperCase();
    } else if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      } else {
        initials = name.substring(0, 2).toUpperCase();
      }
    }

    // Extract token/session info from BFF claims
    const sessionExpiresIn = getClaim("bff:session_expires_in");
    const sessionExpiresAt = sessionExpiresIn
      ? new Date(Date.now() + parseInt(sessionExpiresIn) * 1000).toISOString()
      : undefined;

    return {
      isAuthenticated: true,
      name,
      email,
      initials,
      tokenInfo: {
        sessionExpiresAt,
        accessTokenExpiresAt: undefined, // BFF doesn't expose individual token expiry
        sessionIssuedAt: undefined, // Calculate if needed from session_expires_in
      },
      claims: claims.map((c) => ({ type: c.type, value: c.value })),
    };
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
  let url = `/bff/login`;

  // Append returnUrl if provided
  if (returnUrl) {
    url = `${url}?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  console.log('[Auth] Login redirect:', url);
  console.log('[Auth] Return URL:', returnUrl);
  window.location.href = url;
}

export function logout(returnUrl?: string, logoutUrl?: string) {
  // Use the logout URL from bff:logout_url claim if available (includes CSRF protection)
  // Otherwise fall back to /bff/logout (not recommended for production)
  let url = logoutUrl || `/bff/logout`;

  // Append returnUrl if provided
  if (returnUrl) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  window.location.href = url;
}

// Refresh/validate current user's session
// Note: Duende BFF doesn't have a dedicated refresh endpoint
// Token refresh is handled automatically by the BFF when forwarding API requests
// This function validates the session is still active
export async function refreshTokens(): Promise<{
  success: boolean;
  message?: string;
  expiresAt?: string;
}> {
  try {
    // Fetch user data to validate session is still active
    const response = await myAppBff.get<BffClaim[]>("/user");
    const claims = response.data;

    // Extract session expiration info
    const sessionExpiresIn = claims.find(
      (c) => c.type === "bff:session_expires_in"
    )?.value;
    const expiresAt = sessionExpiresIn
      ? new Date(Date.now() + parseInt(sessionExpiresIn) * 1000).toISOString()
      : undefined;

    return {
      success: true,
      message: "Session is active",
      expiresAt,
    };
  } catch (error) {
    console.error("Error validating session:", error);

    if (error instanceof ApiError) {
      return {
        success: false,
        message:
          error.status === 401
            ? "Session expired - please log in again"
            : `Session validation failed: ${error.status} ${error.statusText}`,
      };
    }

    return {
      success: false,
      message: "Network error during session validation",
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

  // Extract bff:logout_url claim for logout
  const logoutUrl = user?.claims?.find(
    (c) => c.type === "bff:logout_url"
  )?.value;

  // Create a logout function that uses the claim-based URL
  const handleLogout = useCallback(
    (returnUrl?: string) => {
      logout(returnUrl, logoutUrl);
    },
    [logoutUrl]
  );

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
    logout: handleLogout,
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
