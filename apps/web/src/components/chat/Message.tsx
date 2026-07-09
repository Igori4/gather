import { useState } from 'react'
import type { ChatMessage } from '@/api/chat'
import { editMessage } from '@/api/chat'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Message({ message, outingId }: { message: ChatMessage; outingId: string }) {
  const currentUserId = useAuthStore(s => s.user?.id)
  const isOwn = message.userId === currentUserId
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(message.body)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const trimmed = editBody.trim()
    if (!trimmed || trimmed === message.body) {
      setIsEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await editMessage(outingId, message.id, { body: trimmed })
      setIsEditing(false)
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditBody(message.body)
    setIsEditing(false)
    setError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') handleCancel()
  }

  return (
    <div className={cn('flex gap-2 group', isOwn && 'flex-row-reverse')}>
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
        {message.user.name[0].toUpperCase()}
      </div>
      <div className={cn('max-w-[70%] space-y-1', isOwn && 'items-end flex flex-col')}>
        <div className={cn('flex items-baseline gap-2', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-medium">{message.user.name}</span>
          <span className="text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
          {message.editedAt && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {isOwn && !isEditing && (
            <button
              onClick={() => { setEditBody(message.body); setIsEditing(true) }}
              className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-1.5 w-full">
            <Textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              onKeyDown={handleKeyDown}
              className="resize-none min-h-[40px] max-h-[120px] text-sm"
              rows={1}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-1.5">
              <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            {message.body}
          </div>
        )}
      </div>
    </div>
  )
}
