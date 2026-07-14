import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

type State = 'loading' | 'success' | 'error'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [state, setState] = useState<State>('loading')
  const [error, setError] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link.')
      setState('error')
      return
    }

    api.post<{ groupId: string }>('/api/groups/accept-invite', { token })
      .then(res => {
        setGroupId(res.data.groupId)
        setState('success')
      })
      .catch(err => {
        setError(
          err.response?.data?.error ?? 'This invite link is invalid or has expired.'
        )
        setState('error')
      })
  }, [token])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Accepting invitation…</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Invite failed</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button asChild variant="outline">
            <Link to="/groups">Go to groups</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
        <h1 className="text-xl font-semibold">You&apos;re in!</h1>
        <p className="text-muted-foreground text-sm">You&apos;ve successfully joined the group.</p>
        <Button onClick={() => navigate(groupId ? `/groups/${groupId}` : '/groups')}>
          Go to group
        </Button>
      </div>
    </div>
  )
}
