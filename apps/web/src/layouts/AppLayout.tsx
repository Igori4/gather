import { useEffect } from 'react'
import { Navigate, Outlet, NavLink, Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { connectSocket, disconnectSocket } from '@/lib/socket'
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
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const navLinks = [
  { label: 'Dashboard', to: '/groups' },
  { label: 'Circles', to: '/groups' },
  { label: 'Outings', to: '/outings' },
  { label: 'Memories', to: '#' },
]

export function AppLayout() {
  const user = useAuthStore(s => s.user)
  const isInitialized = useAuthStore(s => s.isInitialized)
  const logout = useAuthStore(s => s.logout)
  const accessToken = useAuthStore(s => s.accessToken)
  const compactNav = useFeatureFlag(FEATURE_FLAGS.COMPACT_NAV)

  useEffect(() => {
    if (accessToken) connectSocket(accessToken)
    return () => disconnectSocket()
  }, [accessToken])

  if (!isInitialized) return null
  if (!user) return <Navigate to="/login" replace />

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => null)
    logout()
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/groups" className="text-xl font-bold text-primary tracking-tight">
              {compactNav ? 'G' : 'Gather'}
            </Link>

            {!compactNav && (
              <nav className="flex items-center gap-1">
                {navLinks.map(({ label, to }) => (
                  <NavLink
                    key={label}
                    to={to}
                    className={({ isActive }) =>
                      `px-3 py-1.5 text-sm font-medium rounded-sm transition-colors relative
                      ${isActive
                        ? 'text-foreground after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full'
                        : 'text-muted-foreground hover:text-foreground'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Bell className="h-4 w-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                    <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
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
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border/50 bg-background mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xl font-bold text-primary">Gather</span>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Help Center</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact Us</a>
          </nav>
          <p className="text-xs text-muted-foreground">© 2024 Gather Coordination. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
