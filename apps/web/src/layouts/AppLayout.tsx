import { Navigate, Outlet, NavLink } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/axios'
import { useFeatureFlag } from '@/lib/flags'
import { FEATURE_FLAGS } from '@gather/shared'

function initials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AppLayout() {
  const user = useAuthStore(s => s.user)
  const isInitialized = useAuthStore(s => s.isInitialized)
  const logout = useAuthStore(s => s.logout)
  const compactNav = useFeatureFlag(FEATURE_FLAGS.COMPACT_NAV)

  if (!isInitialized) return null
  if (!user) return <Navigate to="/login" replace />

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => null)
    logout()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div
          className={`max-w-5xl mx-auto px-4 flex items-center justify-between ${compactNav ? 'h-12' : 'h-14'}`}
        >
          <nav className="flex items-center gap-6">
            <span className="font-bold text-lg">{compactNav ? 'G' : 'Gather'}</span>
            <NavLink
              to="/groups"
              title="Groups"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-foreground' : 'text-muted-foreground'}`
              }
            >
              <Users className="h-4 w-4" />
              {!compactNav && 'Groups'}
            </NavLink>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
