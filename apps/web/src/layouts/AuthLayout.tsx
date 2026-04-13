import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function AuthLayout() {
  const user = useAuthStore(s => s.user)

  // Already logged in — send to app
  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Gather</h1>
          <p className="text-muted-foreground mt-1">Plan outings together</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
