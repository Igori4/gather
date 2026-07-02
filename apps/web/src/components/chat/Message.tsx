import type { ChatMessage } from '@/api/chat'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Message({ message }: { message: ChatMessage }) {
  const currentUserId = useAuthStore(s => s.user?.id)
  const isOwn = message.userId === currentUserId

  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
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
        </div>
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {message.body}
        </div>
      </div>
    </div>
  )
}
