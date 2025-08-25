import { useAuth } from '~/hooks/use-auth'
import { Button } from '~/components/ui/button'
import { LogIn, LogOut, Loader2, User } from 'lucide-react'

export function AuthButton() {
  const { user, loading, isAuthenticated, login, logout } = useAuth()

  if (loading) {
    return (
      <Button variant="outline" disabled size="sm" className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  if (isAuthenticated && user) {
    const displayName = user.name || user.email || 'User'
    return (
      <Button
        variant="outline"
        onClick={() => logout(window.location.href)}
        size="sm"
        className="gap-2"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Logout</span>
        <span className="hidden md:inline">{displayName}</span>
      </Button>
    )
  }

  return (
    <Button
      onClick={() => login(window.location.href)}
      size="sm"
      className="gap-2"
    >
      <LogIn className="h-4 w-4" />
      <span>Login</span>
    </Button>
  )
}