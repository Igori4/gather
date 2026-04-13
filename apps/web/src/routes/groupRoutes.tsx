import { Route } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'

// Placeholder — replace with real pages as they're built
function GroupsPage() {
  return <p className="text-muted-foreground">Groups coming soon.</p>
}

export const groupRoutes = (
  <Route element={<AppLayout />}>
    <Route path="/groups" element={<GroupsPage />} />
  </Route>
)
