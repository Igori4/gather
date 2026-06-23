import { Route } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import GroupListPage from '@/pages/groups/GroupListPage'

export const groupRoutes = (
  <Route element={<AppLayout />}>
    <Route path="/groups" element={<GroupListPage />} />
  </Route>
)
