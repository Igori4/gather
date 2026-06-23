import type { CreateGroupInput } from '@gather/shared'
import { api } from '@/lib/axios'

export interface Group {
  id: string
  name: string
  description: string | null
  coverImageUrl: string | null
  createdBy: string
  createdAt: string
  _count: { members: number }
}

export async function listGroups(): Promise<Group[]> {
  const response = await api.get<Group[]>('/api/groups')
  return response.data
}

export async function createGroup(data: CreateGroupInput): Promise<Group> {
  const response = await api.post<Group>('/api/groups', data)
  return response.data
}
