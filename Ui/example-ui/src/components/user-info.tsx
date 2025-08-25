import { useAuth } from '~/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { Separator } from '~/components/ui/separator'
import { User, Mail, Shield, Key, RefreshCw, Clock, Timer } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useEffect, useState } from 'react'

export function UserInfo() {
  const { user, loading, error, isAuthenticated, refetch, refreshTokens } = useAuth()
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)

  const handleRefreshTokens = () => {
    setRefreshMessage(null)
    refreshTokens.mutate()
  }

  // Handle refresh token mutation results
  useEffect(() => {
    if (refreshTokens.isSuccess && refreshTokens.data) {
      if (refreshTokens.data.success) {
        setRefreshMessage('Tokens refreshed successfully!')
      } else {
        setRefreshMessage(refreshTokens.data.message || 'Token refresh failed')
      }
      // Clear message after 3 seconds
      setTimeout(() => setRefreshMessage(null), 3000)
    } else if (refreshTokens.isError) {
      setRefreshMessage('Failed to refresh tokens')
      setTimeout(() => setRefreshMessage(null), 3000)
    }
  }, [refreshTokens.isSuccess, refreshTokens.isError, refreshTokens.data])

  if (loading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>User Information</CardTitle>
          </div>
          <CardDescription>Loading user data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl border-destructive">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Authentication Error</CardTitle>
          </div>
          <CardDescription>Failed to load user information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
            {error}
          </p>
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            className="w-full"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className="w-full max-w-2xl border-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-muted-foreground">Not Authenticated</CardTitle>
          </div>
          <CardDescription>Please log in to view user information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Authentication required</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>User Information</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
              title="Refresh user data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefreshTokens}
              disabled={refreshTokens.isPending}
              className="h-8 w-8 p-0"
              title="Refresh authentication tokens"
            >
              <Clock className={`h-4 w-4 ${refreshTokens.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>Your current session details</CardDescription>
        {refreshMessage && (
          <div className={`text-sm px-3 py-2 rounded-lg ${refreshMessage.includes('success') ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {refreshMessage}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Shield className="h-4 w-4" />
              Status
            </div>
            <Badge 
              variant={isAuthenticated ? "default" : "destructive"}
              className="text-xs"
            >
              {isAuthenticated ? "✓ Authenticated" : "✗ Not Authenticated"}
            </Badge>
          </div>
          
          {user.name && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Name
              </div>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
          )}
          
          {user.email && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                {user.email}
              </p>
            </div>
          )}
        </div>

        {user.tokenInfo && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Timer className="h-4 w-4" />
                Token Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.tokenInfo.accessTokenExpiresAt && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Access Token Expires</div>
                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {new Date(user.tokenInfo.accessTokenExpiresAt).toLocaleString()}
                    </div>
                  </div>
                )}
                {user.tokenInfo.sessionExpiresAt && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Session Expires</div>
                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {new Date(user.tokenInfo.sessionExpiresAt).toLocaleString()}
                    </div>
                  </div>
                )}
                {user.tokenInfo.sessionIssuedAt && (
                  <div className="space-y-2 md:col-span-2">
                    <div className="text-xs font-medium text-muted-foreground">Session Last Refreshed</div>
                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {new Date(user.tokenInfo.sessionIssuedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {user.claims && user.claims.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Key className="h-4 w-4" />
                Claims ({user.claims.length})
              </div>
              <div className="bg-muted/50 border rounded-lg max-h-48 overflow-y-auto">
                <div className="p-3 space-y-2">
                  {user.claims.map((claim, index) => (
                    <div key={index} className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                        {claim.type}
                      </Badge>
                      <span className="font-mono text-muted-foreground bg-background px-2 py-1 rounded border flex-1 min-w-0 break-all">
                        {claim.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}