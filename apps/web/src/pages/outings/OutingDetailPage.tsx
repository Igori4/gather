import { useParams } from 'react-router-dom'
import { useOuting } from '@/hooks/useOutings'
import { useAddPlace, useRemovePlace } from '@/hooks/useOutings'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { PlaceSearch } from '@/components/outings/PlaceSearch'
import { Button } from '@/components/ui/button'
import type { AddPlaceInput } from '@gather/shared'

export default function OutingDetailPage() {
  const { id = '' } = useParams()
  const { data: outing, isLoading } = useOuting(id)
  const addPlace = useAddPlace(id)
  const removePlace = useRemovePlace(id)

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>
  if (!outing) return <p className="text-destructive">Outing not found.</p>

  function handleAddPlace(data: AddPlaceInput) {
    addPlace.mutate(data)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">{outing.title}</h1>
        {outing.description && (
          <p className="text-muted-foreground mt-1">{outing.description}</p>
        )}
        <span className="text-xs text-muted-foreground capitalize">Status: {outing.status}</span>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Places</h2>

        <PlaceSearch onSelect={handleAddPlace} disabled={addPlace.isPending} />

        {addPlace.isError && (
          <p className="mt-1 text-sm text-destructive">
            {(addPlace.error as Error)?.message ?? 'Failed to add place'}
          </p>
        )}

        {outing.places && outing.places.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {outing.places.map(place => (
              <li
                key={place.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{place.name}</p>
                  <p className="text-xs text-muted-foreground">{place.address}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removePlace.mutate(place.placeId)}
                  disabled={removePlace.isPending}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No places added yet.</p>
        )}
      </section>

      <ChatWindow outingId={id}>
        <ChatWindow.MessageList />
        <ChatWindow.Input />
      </ChatWindow>
    </div>
  )
}
