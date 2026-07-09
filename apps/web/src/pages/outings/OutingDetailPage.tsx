import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  MapPin,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Share2,
  CheckCircle,
  ChevronRight,
  Users,
  Trash2,
} from 'lucide-react'
import {
  useOuting,
  useAddPlace,
  useRemovePlace,
  useCastVote,
  useProposeSlot,
  useVoteSlot,
  useDeleteSlot,
  useConfirmOuting,
  useRSVP,
} from '@/hooks/useOutings'
import { useAuthStore } from '@/stores/authStore'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { PlaceSearch } from '@/components/outings/PlaceSearch'
import { OutingMap } from '@/components/outings/OutingMap'
import { ProposeSlotForm } from '@/components/outings/ProposeSlotForm'
import { AiSuggestions } from '@/components/outings/AiSuggestions'
import { Button } from '@/components/ui/button'
import type { AddPlaceInput } from '@gather/shared'
import type { MapboxFeature } from '@/components/outings/PlaceSearch'
import type { OutingPlace, TimeSlot, RSVPEntry } from '@/api/outings'

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
                ${
                  userVote === 'up'
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-muted-foreground hover:text-primary hover:bg-muted'
                }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {upCount > 0 && <span>{upCount}</span>}
            </button>
            <button
              onClick={() => onVote(place.placeId, 'down')}
              disabled={votePending}
              className={`flex items-center gap-1 text-xs px-1.5 py-1 rounded-md transition-colors
                ${
                  userVote === 'down'
                    ? 'text-destructive bg-destructive/10 font-semibold'
                    : 'text-muted-foreground hover:text-destructive hover:bg-muted'
                }`}
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

function AvailabilitySection({
  slots,
  currentUserId,
  onVote,
  onDelete,
  onPropose,
  proposePending,
  votePending,
}: AvailabilitySectionProps) {
  const allAvailable =
    slots.length > 0 ? Math.max(...slots.map(s => s.votes.filter(v => v.available).length)) : 0

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
                      ${
                        userVote?.available === true
                          ? 'bg-emerald-500 text-white font-semibold'
                          : 'border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                      }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Can
                  </button>
                  <button
                    onClick={() => onVote(slot.id, false)}
                    disabled={votePending}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors
                      ${
                        userVote?.available === false
                          ? 'bg-destructive text-white font-semibold'
                          : 'border hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                      }`}
                  >
                    Can&apos;t
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

// ── RSVPBar ───────────────────────────────────────────────────────

interface RSVPBarProps {
  rsvps: RSVPEntry[]
  currentUserId: string
  onRSVP: (status: 'going' | 'maybe' | 'not_going') => void
  isPending: boolean
}

function RSVPBar({ rsvps, currentUserId, onRSVP, isPending }: RSVPBarProps) {
  const going = rsvps.filter(r => r.status === 'going').length
  const maybe = rsvps.filter(r => r.status === 'maybe').length
  const notGoing = rsvps.filter(r => r.status === 'not_going').length
  const userStatus = rsvps.find(r => r.userId === currentUserId)?.status ?? null

  const btn = (
    status: 'going' | 'maybe' | 'not_going',
    label: string,
    count: number,
    activeClass: string
  ) => (
    <button
      onClick={() => onRSVP(status)}
      disabled={isPending}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-sm font-medium transition-colors border
        ${
          userStatus === status
            ? activeClass
            : 'border-transparent hover:bg-muted text-muted-foreground'
        }`}
    >
      <span className="text-base font-bold">{count}</span>
      <span className="text-xs">{label}</span>
    </button>
  )

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-base">RSVP</h2>
      </div>
      <div className="flex gap-2">
        {btn('going', 'Going', going, 'border-emerald-300 bg-emerald-50 text-emerald-700')}
        {btn('maybe', 'Maybe', maybe, 'border-amber-300 bg-amber-50 text-amber-700')}
        {btn(
          'not_going',
          "Can't",
          notGoing,
          'border-destructive/30 bg-destructive/5 text-destructive'
        )}
      </div>
    </div>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────

interface ConfirmModalProps {
  places: OutingPlace[]
  slots: TimeSlot[]
  onConfirm: (placeId: string, slotId: string) => void
  onClose: () => void
  isPending: boolean
}

function ConfirmModal({ places, slots, onConfirm, onClose, isPending }: ConfirmModalProps) {
  const [selPlace, setSelPlace] = useState('')
  const [selSlot, setSelSlot] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
        <h2 className="text-lg font-semibold">Confirm Outing</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">Place</label>
          <select
            value={selPlace}
            onChange={e => setSelPlace(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Pick a place…</option>
            {places.map(p => (
              <option key={p.placeId} value={p.placeId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Time Slot</label>
          <select
            value={selSlot}
            onChange={e => setSelSlot(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Pick a slot…</option>
            {slots.map(s => (
              <option key={s.id} value={s.id}>
                {format(new Date(s.startsAt), 'EEE, MMM d · h:mm a')} –{' '}
                {format(new Date(s.endsAt), 'h:mm a')}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!selPlace || !selSlot || isPending}
            onClick={() => onConfirm(selPlace, selSlot)}
          >
            {isPending ? 'Confirming…' : 'Confirm'}
          </Button>
        </div>
      </div>
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
  const confirmOuting = useConfirmOuting(id)
  const rsvpMutation = useRSVP(id)
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const currentUserId = useAuthStore(s => s.user?.id ?? '')

  if (isLoading) return <p className="text-muted-foreground py-8">Loading…</p>
  if (!outing) return <p className="text-destructive py-8">Outing not found.</p>

  const places = outing.places ?? []
  const slots = outing.slots ?? []
  const rsvps = outing.rsvps ?? []
  const isAdmin = outing.group?.members.find(m => m.userId === currentUserId)?.role === 'admin'
  const isConfirmed = outing.status === 'confirmed'

  const confirmedPlace =
    isConfirmed && outing.confirmedPlaceId
      ? (places.find(p => p.placeId === outing.confirmedPlaceId) ?? null)
      : null
  const confirmedSlot =
    isConfirmed && outing.confirmedSlotId
      ? (slots.find(s => s.id === outing.confirmedSlotId) ?? null)
      : null

  function handleAddPlace(data: AddPlaceInput) {
    addPlace.mutate(data)
    setSearchResults([])
  }

  function handleConfirm(placeId: string, slotId: string) {
    confirmOuting.mutate(
      { placeId, slotId },
      {
        onSuccess: () => setShowConfirmModal(false),
      }
    )
  }

  return (
    <div className="space-y-6">
      {showConfirmModal && (
        <ConfirmModal
          places={places}
          slots={slots}
          onConfirm={handleConfirm}
          onClose={() => setShowConfirmModal(false)}
          isPending={confirmOuting.isPending}
        />
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/groups" className="hover:text-foreground transition-colors">
          Outings
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{outing.title}</span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{outing.title}</h1>
          {outing.description && (
            <p className="text-emerald-600 mt-1 text-sm font-medium">{outing.description}</p>
          )}
          <span
            className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize
            ${
              isConfirmed
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
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <Share2 className="h-3.5 w-3.5" /> Invite
          </Button>
          {isAdmin && !isConfirmed && (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={places.length === 0 || slots.length === 0}
              onClick={() => setShowConfirmModal(true)}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Confirm Outing
            </Button>
          )}
        </div>
      </div>

      {/* Confirmed banner */}
      {isConfirmed && confirmedPlace && confirmedSlot && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span className="font-semibold text-sm">Outing Confirmed!</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-emerald-800 ml-0 sm:ml-2">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {confirmedPlace.name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(confirmedSlot.startsAt), 'EEE, MMM d · h:mm a')}
              {' – '}
              {format(new Date(confirmedSlot.endsAt), 'h:mm a')}
            </span>
          </div>
        </div>
      )}

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
            <p className="text-sm text-muted-foreground">
              No places yet — search or click the map.
            </p>
          )}

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

          <OutingMap places={places} searchResults={searchResults} onSelect={handleAddPlace} />
        </div>

        {/* RIGHT — RSVP + Availability + Gemini */}
        <div className="space-y-4">
          <RSVPBar
            rsvps={rsvps}
            currentUserId={currentUserId}
            onRSVP={status => rsvpMutation.mutate(status)}
            isPending={rsvpMutation.isPending}
          />
          <AvailabilitySection
            slots={slots}
            currentUserId={currentUserId}
            onVote={(slotId, available) => voteSlot.mutate({ slotId, available })}
            onDelete={slotId => deleteSlot.mutate(slotId)}
            onPropose={(startsAt, endsAt) => proposeSlot.mutate({ startsAt, endsAt })}
            proposePending={proposeSlot.isPending}
            votePending={voteSlot.isPending}
          />
          <AiSuggestions groupId={outing.groupId} outingId={id} />
        </div>
      </div>

      <ChatWidget outingId={id} />
    </div>
  )
}
