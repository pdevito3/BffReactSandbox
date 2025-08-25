import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useCallback } from 'react'
import { BFF_BASE_URL, bffGet, bffPost, ApiError } from '../lib/api'

// Authentication types
export interface TokenInfo {
  accessTokenExpiresAt?: string
  sessionExpiresAt?: string
  sessionIssuedAt?: string
}

export interface User {
  isAuthenticated: boolean
  claims?: Array<{
    type: string
    value: string
  }>
  tokenInfo?: TokenInfo
}

export interface AuthStatus {
  isAuthenticated: boolean
  name?: string
}

// API functions
async function fetchAuthStatus(): Promise<AuthStatus> {
  try {
    return await bffGet<AuthStatus>('/bff/status')
  } catch (error) {
    console.error('Error checking auth status:', error)
    return { isAuthenticated: false }
  }
}

async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await bffGet<User>('/bff/user')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { isAuthenticated: false }
    }
    
    console.error('Error fetching user:', error)
    return null
  }
}

// Authentication actions
export function login(returnUrl?: string) {
  const url = new URL(`${BFF_BASE_URL}/bff/login`)
  if (returnUrl) {
    url.searchParams.set('returnUrl', returnUrl)
  }
  window.location.href = url.toString()
}

export function logout(returnUrl?: string) {
  const url = new URL(`${BFF_BASE_URL}/bff/logout`)
  if (returnUrl) {
    url.searchParams.set('returnUrl', returnUrl)
  }
  window.location.href = url.toString()
}

// Refresh current user's tokens
export async function refreshTokens(): Promise<{success: boolean, message?: string, expiresAt?: string}> {
  try {
    return await bffPost<{success: boolean, message?: string, expiresAt?: string}>('/bff/refresh')
  } catch (error) {
    console.error('Error refreshing tokens:', error)
    
    if (error instanceof ApiError) {
      return {
        success: false,
        message: `Token refresh failed: ${error.status} ${error.statusText}`,
      }
    }
    
    return {
      success: false,
      message: 'Network error during token refresh',
    }
  }
}

// Query keys
const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  status: () => [...authKeys.all, 'status'] as const,
}

// Helper function to get claim value by type
function getClaimValue(user?: User | null, claimType: string): string | undefined {
  return user?.claims?.find(claim => claim.type === claimType)?.value
}

// Helper function to get user name from claims
function getUserName(user?: User | null): string | undefined {
  const firstName = getClaimValue(user, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname')
  const lastName = getClaimValue(user, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname')
  
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ')
  }
  
  // Fallback to other name claims
  const nameClaim = getClaimValue(user, 'name') || 
                   getClaimValue(user, 'given_name') ||
                   getClaimValue(user, 'family_name') ||
                   getClaimValue(user, 'preferred_username') ||
                   getClaimValue(user, 'nickname')
  
  return nameClaim
}

// Helper function to get user email from claims
function getUserEmail(user?: User | null): string | undefined {
  // Try standard email claims and full claim URLs
  return getClaimValue(user, 'email') || 
         getClaimValue(user, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') ||
         getClaimValue(user, 'email_verified')
}

// Helper function to get user initials
function getUserInitials(user?: User | null): string {
  if (!user) return 'U'
  
  const name = getUserName(user)
  const email = getUserEmail(user)
  
  // Try to get initials from name first
  if (name) {
    const nameParts = name.trim().split(/\s+/)
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase()
    }
    return nameParts.map(part => part[0]).join('').substring(0, 2).toUpperCase()
  }
  
  // Fallback to email initials
  if (email) {
    const emailParts = email.split('@')[0]
    return emailParts.substring(0, 2).toUpperCase()
  }
  
  return 'U' // Ultimate fallback
}

// Main auth hook
export function useAuth() {
  const queryClient = useQueryClient()
  
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
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      return failureCount < 3
    },
  })

  const invalidateAuth = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: authKeys.all })
  }, [queryClient])

  const refreshAuth = useCallback(() => {
    return refetch()
  }, [refetch])

  const refreshTokensMutation = useMutation({
    mutationFn: refreshTokens,
    onSuccess: () => {
      // Invalidate and refetch user data after successful token refresh
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
      queryClient.invalidateQueries({ queryKey: authKeys.status() })
      refetch()
    },
    onError: (error) => {
      console.error('Token refresh failed:', error)
    },
  })

  const userInitials = getUserInitials(user)
  const userName = getUserName(user)
  const userEmail = getUserEmail(user)

  return {
    user,
    loading,
    error: error?.message ?? null,
    isAuthenticated: user?.isAuthenticated ?? false,
    userInitials,
    userName,
    userEmail,
    refetch: refreshAuth,
    invalidateAuth,
    refreshTokens: refreshTokensMutation,
    login,
    logout,
  }
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
  })

  return {
    ...status,
    isAuthenticated: status?.isAuthenticated ?? false,
    loading,
    error: error?.message ?? null,
    refetch,
  }
}