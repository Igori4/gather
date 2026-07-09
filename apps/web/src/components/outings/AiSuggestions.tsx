import { useState } from 'react'
import { Sparkles, ExternalLink, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/axios'
import type { AiSuggestion } from '@gather/shared'

interface Suggestion {
  name: string
  category: string
  whyItFits: string
  estimatedCostRange: string
  googleMapsLink: string
}

interface AiSuggestionsProps {
  groupId: string
  outingId?: string
}

export function AiSuggestions({ groupId, outingId }: AiSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [recordId, setRecordId] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setSuggestions(null)
    setDismissed(new Set())
    try {
      const res = await api.post<AiSuggestion & { id: string }>(
        `/api/groups/${groupId}/ai-suggestions`,
        {
          outingId,
        }
      )
      setSuggestions(res.data.suggestions)
      setRecordId(res.data.id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Failed to generate suggestions. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDismissAll() {
    if (recordId) {
      try {
        await api.delete(`/api/ai-suggestions/${recordId}`)
      } catch {}
    }
    setSuggestions(null)
    setDismissed(new Set())
    setRecordId(null)
  }

  const visible = suggestions?.filter((_, i) => !dismissed.has(i)) ?? []

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <div>
            <h2 className="font-semibold text-base leading-tight">AI Suggestions</h2>
            <p className="text-xs text-muted-foreground">Powered by Gemini + MCP</p>
          </div>
        </div>
        {suggestions && (
          <button
            onClick={handleDismissAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {!suggestions && !loading && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Get personalised venue ideas based on your group's history and preferences.
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" /> Get ideas
          </button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs">Gemini is thinking…</p>
        </div>
      )}

      {suggestions && visible.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s, i) => {
            if (dismissed.has(i)) return null
            return (
              <div key={i} className="rounded-xl border bg-muted/30 p-4 relative group">
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, i]))}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-start gap-2 mb-1.5">
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                    {s.category}
                  </span>
                </div>
                <p className="font-semibold text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.whyItFits}</p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground font-medium">
                    {s.estimatedCostRange}
                  </span>
                  <a
                    href={s.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View on Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )
          })}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 border border-dashed rounded-xl transition-colors"
          >
            Generate new ideas (max 5/day per group)
          </button>
        </div>
      )}

      {suggestions && visible.length === 0 && (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground">All suggestions dismissed.</p>
          <button onClick={handleGenerate} className="mt-2 text-xs text-primary hover:underline">
            Generate new ideas
          </button>
        </div>
      )}
    </div>
  )
}
