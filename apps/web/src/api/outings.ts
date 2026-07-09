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

export interface SlotVote {
  userId: string
  available: boolean
}

export interface SlotTally {
  available: number
  unavailable: number
  userVote: boolean | null
}

export interface TimeSlot {
  id: string
  outingId: string
  proposedBy: string
  startsAt: string
  endsAt: string
  votes: SlotVote[]
}

export interface RSVPEntry {
  userId: string
  status: 'going' | 'maybe' | 'not_going'
}

export interface GroupMemberRef {
  userId: string
  role: string
}

export interface Outing {
  id: string
  groupId: string
  title: string
  description: string | null
  status: string
  createdBy: string
  createdAt: string
  confirmedAt?: string | null
  confirmedPlaceId?: string | null
  confirmedSlotId?: string | null
  places?: OutingPlace[]
  slots?: TimeSlot[]
  rsvps?: RSVPEntry[]
  group?: { members: GroupMemberRef[] }
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

export async function castVote(
  outingId: string,
  placeId: string,
  vote: 'up' | 'down'
): Promise<VoteTally> {
  const res = await api.post<VoteTally>(`/api/outings/${outingId}/places/${placeId}/vote`, { vote })
  return res.data
}

export async function proposeSlot(
  outingId: string,
  startsAt: string,
  endsAt: string
): Promise<TimeSlot> {
  const res = await api.post<TimeSlot>(`/api/outings/${outingId}/slots`, { startsAt, endsAt })
  return res.data
}

export async function voteSlot(
  outingId: string,
  slotId: string,
  available: boolean
): Promise<SlotTally> {
  const res = await api.post<SlotTally>(`/api/outings/${outingId}/slots/${slotId}/vote`, {
    available,
  })
  return res.data
}

export async function deleteSlot(outingId: string, slotId: string): Promise<void> {
  await api.delete(`/api/outings/${outingId}/slots/${slotId}`)
}

export async function confirmOuting(
  outingId: string,
  placeId: string,
  slotId: string
): Promise<Outing> {
  const res = await api.post<Outing>(`/api/outings/${outingId}/confirm`, { placeId, slotId })
  return res.data
}

export async function rsvp(
  outingId: string,
  status: 'going' | 'maybe' | 'not_going'
): Promise<RSVPEntry> {
  const res = await api.post<RSVPEntry>(`/api/outings/${outingId}/rsvp`, { status })
  return res.data
}
