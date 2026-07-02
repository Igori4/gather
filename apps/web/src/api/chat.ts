import { api } from '@/lib/axios'
import type { SendMessageInput, EditMessageInput } from '@gather/shared'

export interface ChatMessage {
  id: string
  outingId: string
  userId: string
  body: string
  createdAt: string
  editedAt: string | null
  user: { id: string; name: string; avatarUrl: string | null }
}

export interface MessagesPage {
  messages: ChatMessage[]
  nextCursor: string | null
}

export async function fetchMessages(outingId: string, cursor?: string): Promise<MessagesPage> {
  const params = new URLSearchParams({ limit: '30' })
  if (cursor) params.set('cursor', cursor)
  const res = await api.get<MessagesPage>(`/api/outings/${outingId}/messages?${params}`)
  return res.data
}

export async function sendMessage(outingId: string, data: SendMessageInput): Promise<ChatMessage> {
  const res = await api.post<ChatMessage>(`/api/outings/${outingId}/messages`, data)
  return res.data
}

export async function editMessage(
  outingId: string,
  messageId: string,
  data: EditMessageInput
): Promise<ChatMessage> {
  const res = await api.patch<ChatMessage>(`/api/outings/${outingId}/messages/${messageId}`, data)
  return res.data
}

export async function deleteMessage(outingId: string, messageId: string): Promise<void> {
  await api.delete(`/api/outings/${outingId}/messages/${messageId}`)
}
