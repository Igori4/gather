import { Route } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import GroupListPage from '@/pages/groups/GroupListPage'
import GroupDetailPage from '@/pages/groups/GroupDetailPage'
import AcceptInvitePage from '@/pages/groups/AcceptInvitePage'
import OutingDetailPage from '@/pages/outings/OutingDetailPage'

export const groupRoutes = (
  <Route element={<AppLayout />}>
    <Route path="/groups" element={<GroupListPage />} />
    <Route path="/groups/:id" element={<GroupDetailPage />} />
    <Route path="/accept-invite" element={<AcceptInvitePage />} />
    <Route path="/outings/:id" element={<OutingDetailPage />} />
  </Route>
)
