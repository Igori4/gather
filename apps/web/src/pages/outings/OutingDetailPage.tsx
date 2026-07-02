import { useParams } from 'react-router-dom'
import { useOuting } from '@/hooks/useOutings'
import { ChatWindow } from '@/components/chat/ChatWindow'

export default function OutingDetailPage() {
  const { id = '' } = useParams()
  const { data: outing, isLoading } = useOuting(id)

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>
  if (!outing) return <p className="text-destructive">Outing not found.</p>

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">{outing.title}</h1>
        {outing.description && (
          <p className="text-muted-foreground mt-1">{outing.description}</p>
        )}
        <span className="text-xs text-muted-foreground capitalize">Status: {outing.status}</span>
      </div>
      <ChatWindow outingId={id} />
    </div>
  )
}
