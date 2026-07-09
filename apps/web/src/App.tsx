import { Routes, Route, Navigate } from 'react-router-dom'
import { authRoutes } from '@/routes/authRoutes'
import { groupRoutes } from '@/routes/groupRoutes'

export default function App() {
  console.log('App deployed!!!v1')
  return (
    <Routes>
      {authRoutes}
      {groupRoutes}
      <Route path="/" element={<Navigate to="/groups" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
