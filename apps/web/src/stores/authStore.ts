import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isInitialized: boolean
  setUser: (user: AuthUser | null) => void
  setAccessToken: (token: string | null) => void
  setInitialized: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  setUser: user => set({ user }),
  setAccessToken: token => set({ accessToken: token }),
  setInitialized: () => set({ isInitialized: true }),
  logout: () => set({ user: null, accessToken: null }),
}))
