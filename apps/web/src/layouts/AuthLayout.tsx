import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function AuthLayout() {
  const user = useAuthStore(s => s.user)
  // Already logged in — send to app
  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen justify-between flex flex-col bg-muted/40 px-4">
      <div className='w-full flex justify-between'>
        <h1 className="text-3xl font-bold tracking-tight">Gather</h1>
      </div>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
      <div className='w-full flex justify-between'>
        <h1 className="text-3xl font-bold tracking-tight">Footer</h1>
      </div>
    </div>
  )
}
