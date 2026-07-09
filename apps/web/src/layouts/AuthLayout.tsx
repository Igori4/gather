import { HelpCircle } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function AuthLayout() {
  const user = useAuthStore(s => s.user)
  // Already logged in — send to app
  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen justify-between flex flex-col px-4 container mx-auto">
      <div className="w-full flex justify-between items-center py-4">
        <h1 className="text-3xl text-primary font-bold tracking-tight">Gather</h1>
        <a
          href="#"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
          Support
        </a>
      </div>
      <div className="w-full py-8">
        <Outlet />
      </div>
      <div className="w-full flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-primary font-bold">Gather</span>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-foreground">
            Terms of Service
          </a>
          <a href="#" className="hover:text-foreground">
            Contact Support
          </a>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Gather Coordination Inc.</p>
      </div>
    </div>
  )
}
