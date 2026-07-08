import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProposeSlotFormProps {
  onPropose: (startsAt: string, endsAt: string) => void
  isPending: boolean
}

export function ProposeSlotForm({ onPropose, isPending }: ProposeSlotFormProps) {
  const [date, setDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    setError(null)
    if (!date) { setError('Pick a date'); return }
    if (!startTime || !endTime) { setError('Fill both times'); return }

    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startsAt = new Date(date)
    startsAt.setHours(sh, sm, 0, 0)
    const endsAt = new Date(date)
    endsAt.setHours(eh, em, 0, 0)

    if (endsAt <= startsAt) { setError('End must be after start'); return }

    onPropose(startsAt.toISOString(), endsAt.toISOString())
    setDate(undefined)
    setStartTime('10:00')
    setEndTime('12:00')
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Propose a time slot</p>

      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        disabled={{ before: new Date() }}
        className="rounded-md border p-0"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Start</Label>
          <Input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End</Label>
          <Input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {date && (
        <p className="text-xs text-muted-foreground">
          {format(date, 'EEE, MMM d')} · {startTime} – {endTime}
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        size="sm"
        className="w-full"
        onClick={handleSubmit}
        disabled={isPending || !date}
      >
        {isPending ? 'Proposing…' : 'Propose Slot'}
      </Button>
    </div>
  )
}
