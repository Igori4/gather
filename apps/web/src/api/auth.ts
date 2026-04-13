import type { RegisterInput, LoginInput } from '@gather/shared'
import { api } from '@/lib/axios'
import type { AuthUser } from '@/stores/authStore'

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export async function register(data: RegisterInput): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', data)
  return response.data
}

export async function login(data: LoginInput): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', data)
  return response.data
}
