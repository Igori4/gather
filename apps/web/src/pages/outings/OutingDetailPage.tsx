import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  MapPin, Calendar, ThumbsUp, ThumbsDown, Plus, Share2,
  CheckCircle, ChevronRight, Sparkles, Sun, Users, Trash2,
} from 'lucide-react'
import { useOuting, useAddPlace, useRemovePlace, useCastVote, useProposeSlot, useVoteSlot, useDeleteSlot } from '@/hooks/useOutings'
import { useAuthStore } from '@/stores/authStore'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { PlaceSearch } from '@/components/outings/PlaceSearch'
import { OutingMap } from '@/components/outings/OutingMap'
import { ProposeSlotForm } from '@/components/outings/ProposeSlotForm'
import { Button } from '@/components/ui/button'
import type { AddPlaceInput } from '@gather/shared'
import type { MapboxFeature } from '@/components/outings/PlaceSearch'
import type { OutingPlace, TimeSlot } from '@/api/outings'

// ── Under-development overlay ─────────────────────────────────────

function UnderDevelopment({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 rounded-2xl bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 pointer-events-none">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">Under Development</span>
      </div>
    </div>
  )
}

// ── Placeholder data ──────────────────────────────────────────────

const PLACEHOLDER_INSIGHTS = [
  {
    icon: Sun,
    title: 'Weather Alert',
    body: 'Sunday is forecasted to be rainy. Consider venues with indoor seating.',
  },
  {
    icon: Users,
    title: 'Capacity Check',
    body: 'Based on your crew size, some venues may require a reservation for groups.',
  },
]

// ── Sub-components ────────────────────────────────────────────────

interface PlaceCardProps {
  place: OutingPlace
  currentUserId: string
  onVote: (placeId: string, vote: 'up' | 'down') => void
  votePending: boolean
  onRemove: () => void
}

function PlaceCard({ place, currentUserId, onVote, votePending, onRemove }: PlaceCardProps) {
  const upCount = place.votes.filter(v => v.vote === 'up').length
  const downCount = place.votes.filter(v => v.vote === 'down').length
  const userVote = place.votes.find(v => v.userId === currentUserId)?.vote ?? null

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="relative h-36 bg-muted">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 text-white text-xs font-semibold px-1.5 py-0.5 rounded-md">
          ★ 4.5
        </span>
      </div>

      <div className="px-3 py-2">
        <p className="text-sm font-semibold leading-tight">{place.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{place.address}</p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onVote(place.placeId, 'up')}
              disabled={votePending}
              className={`flex items-center gap-1 text-xs px-1.5 py-1 rounded-md transition-colors
                ${userVote === 'up'
                  ? 'text-primary bg-primary/10 font-semibold'
                  : 'text-muted-foreground hover:text-primary hover:bg-muted'}`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {upCount > 0 && <span>{upCount}</span>}
            </button>
            <button
              onClick={() => onVote(place.placeId, 'down')}
              disabled={votePending}
              className={`flex items-center gap-1 text-xs px-1.5 py-1 rounded-md transition-colors
                ${userVote === 'down'
                  ? 'text-destructive bg-destructive/10 font-semibold'
                  : 'text-muted-foreground hover:text-destructive hover:bg-muted'}`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {downCount > 0 && <span>{downCount}</span>}
            </button>
          </div>
          <button
            onClick={onRemove}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

interface AvailabilitySectionProps {
  slots: TimeSlot[]
  currentUserId: string
  onVote: (slotId: string, available: boolean) => void
  onDelete: (slotId: string) => void
  onPropose: (startsAt: string, endsAt: string) => void
  proposePending: boolean
  votePending: boolean
}

function AvailabilitySection({ slots, currentUserId, onVote, onDelete, onPropose, proposePending, votePending }: AvailabilitySectionProps) {
  const allAvailable = slots.length > 0
    ? Math.max(...slots.map(s => s.votes.filter(v => v.available).length))
    : 0

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">Availability</h2>
        </div>
        {allAvailable > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            {allAvailable} can attend
          </span>
        )}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No time slots proposed yet.</p>
      ) : (
        <div className="space-y-2">
          {slots.map(slot => {
            const availCount = slot.votes.filter(v => v.available).length
            const unavailCount = slot.votes.filter(v => !v.available).length
            const userVote = slot.votes.find(v => v.userId === currentUserId)
            const isMax = availCount === allAvailable && allAvailable > 0

            return (
              <div
                key={slot.id}
                className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-2
                  ${isMax ? 'border-emerald-200 bg-emerald-50/50' : ''}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {format(new Date(slot.startsAt), 'EEE, MMM d · h:mm a')}
                    {' – '}
                    {format(new Date(slot.endsAt), 'h:mm a')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {availCount > 0 && `✓ ${availCount} available`}
                    {unavailCount > 0 && `  ✗ ${unavailCount} unavailable`}
                    {slot.votes.length === 0 && 'No votes yet'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onVote(slot.id, true)}
                    disabled={votePending}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors
                      ${userVote?.available === true
                        ? 'bg-emerald-500 text-white font-semibold'
                        : 'border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'}`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Can
                  </button>
                  <button
                    onClick={() => onVote(slot.id, false)}
                    disabled={votePending}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors
                      ${userVote?.available === false
                        ? 'bg-destructive text-white font-semibold'
                        : 'border hover:bg-red-50 hover:text-red-600 hover:border-red-300'}`}
                  >
                    Can't
                  </button>
                  <button
                    onClick={() => onDelete(slot.id)}
                    disabled={votePending}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ProposeSlotForm onPropose={onPropose} isPending={proposePending} />
    </div>
  )
}

function GeminiInsightsSection() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </span>
        <div>
          <h2 className="font-semibold text-base leading-tight">Gemini Insights</h2>
          <p className="text-xs text-muted-foreground">AI-powered outing optimization</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {PLACEHOLDER_INSIGHTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">{title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground italic border-t pt-3">
        ✦ Gemini suggestions will appear here once your outing has places and time slots.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function OutingDetailPage() {
  const { id = '' } = useParams()
  const { data: outing, isLoading } = useOuting(id)
  const addPlace = useAddPlace(id)
  const removePlace = useRemovePlace(id)
  const castVote = useCastVote(id)
  const proposeSlot = useProposeSlot(id)
  const voteSlot = useVoteSlot(id)
  const deleteSlot = useDeleteSlot(id)
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([])
  const currentUserId = useAuthStore(s => s.user?.id ?? '')

  if (isLoading) return <p className="text-muted-foreground py-8">Loading…</p>
  if (!outing) return <p className="text-destructive py-8">Outing not found.</p>

  const places = outing.places ?? []

  function handleAddPlace(data: AddPlaceInput) {
    addPlace.mutate(data)
    setSearchResults([])
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/groups" className="hover:text-foreground transition-colors">Outings</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {outing.title}
        </span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{outing.title}</h1>
          {outing.description && (
            <p className="text-emerald-600 mt-1 text-sm font-medium">{outing.description}</p>
          )}
          <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize
            ${outing.status === 'confirmed'
              ? 'bg-emerald-100 text-emerald-700'
              : outing.status === 'voting'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {outing.status}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* placeholder — PBI-1.4 invite flow */}
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <Share2 className="h-3.5 w-3.5" /> Invite
          </Button>
          {/* placeholder — PBI-3.5 confirm */}
          <Button size="sm" className="gap-1.5 bg-primary/90 hover:bg-primary" disabled>
            <CheckCircle className="h-3.5 w-3.5" /> Confirm Outing
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 items-start">

        {/* LEFT — Place Voting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-base">Place Voting</h2>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Active
            </span>
          </div>

          {/* Real place cards */}
          {places.length > 0 ? (
            places.map(place => (
              <PlaceCard
                key={place.id}
                place={place}
                currentUserId={currentUserId}
                onVote={(placeId, vote) => castVote.mutate({ placeId, vote })}
                votePending={castVote.isPending}
                onRemove={() => removePlace.mutate(place.placeId)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No places yet — search or click the map.</p>
          )}

          {/* Propose / Search */}
          <div className="rounded-xl border border-dashed p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium mb-1">
              <Plus className="h-4 w-4" /> Propose New Place
            </div>
            <PlaceSearch
              onSelect={handleAddPlace}
              onResults={setSearchResults}
              disabled={addPlace.isPending}
            />
            {addPlace.isError && (
              <p className="text-xs text-destructive">
                {(addPlace.error as Error)?.message ?? 'Failed to add place'}
              </p>
            )}
          </div>

          {/* Map */}
          <OutingMap
            places={places}
            searchResults={searchResults}
            onSelect={handleAddPlace}
          />
        </div>

        {/* RIGHT — Availability + Gemini */}
        <div className="space-y-4">
          <AvailabilitySection
            slots={outing.slots ?? []}
            currentUserId={currentUserId}
            onVote={(slotId, available) => voteSlot.mutate({ slotId, available })}
            onDelete={(slotId) => deleteSlot.mutate(slotId)}
            onPropose={(startsAt, endsAt) => proposeSlot.mutate({ startsAt, endsAt })}
            proposePending={proposeSlot.isPending}
            votePending={voteSlot.isPending}
          />
          <UnderDevelopment><GeminiInsightsSection /></UnderDevelopment>
        </div>
      </div>

      <ChatWidget outingId={id} />
    </div>
  )
}
