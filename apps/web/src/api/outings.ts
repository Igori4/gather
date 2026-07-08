import { api } from '@/lib/axios'
import type { CreateOutingInput, AddPlaceInput } from '@gather/shared'

export interface PlaceVote {
  userId: string
  vote: 'up' | 'down'
}

export interface VoteTally {
  up: number
  down: number
  userVote: 'up' | 'down' | null
}

export interface OutingPlace {
  id: string
  outingId: string
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  mapboxUrl: string | null
  addedBy: string
  createdAt: string
  votes: PlaceVote[]
}

export interface Outing {
  id: string
  groupId: string
  title: string
  description: string | null
  status: string
  createdBy: string
  createdAt: string
  places?: OutingPlace[]
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

export async function addPlace(outingId: string, data: AddPlaceInput): Promise<OutingPlace> {
  const res = await api.post<OutingPlace>(`/api/outings/${outingId}/places`, data)
  return res.data
}

export async function removePlace(outingId: string, placeId: string): Promise<void> {
  await api.delete(`/api/outings/${outingId}/places/${placeId}`)
}

export async function castVote(outingId: string, placeId: string, vote: 'up' | 'down'): Promise<VoteTally> {
  const res = await api.post<VoteTally>(`/api/outings/${outingId}/places/${placeId}/vote`, { vote })
  return res.data
}
