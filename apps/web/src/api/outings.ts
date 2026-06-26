import { api } from '@/lib/axios'
import type { CreateOutingInput } from '@gather/shared'

export interface Outing {
  id: string
  groupId: string
  title: string
  description: string | null
  status: string
  createdBy: string
  createdAt: string
}

export async function listOutings(groupId: string): Promise<Outing[]> {
  const res = await api.get<Outing[]>(`/api/groups/${groupId}/outings`)
  return res.data
}

export async function createOuting(groupId: string, data: CreateOutingInput): Promise<Outing> {
  const res = await api.post<Outing>(`/api/groups/${groupId}/outings`, data)
  return res.data
}

export async function getOuting(outingId: string): Promise<Outing> {
  const res = await api.get<Outing>(`/api/outings/${outingId}`)
  return res.data
}
