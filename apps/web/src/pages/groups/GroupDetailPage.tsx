import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useOutings } from '@/hooks/useOutings'
import { CreateOutingModal } from '@/components/outings/CreateOutingModal'
import { Users, CalendarDays } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface GroupDetail {
  id: string
  name: string
  description: string | null
  members: {
    userId: string
    role: string
    user: { id: string; name: string; email: string }
  }[]
}

function useGroupDetail(id: string) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const res = await api.get<GroupDetail>(`/api/groups/${id}`)
      return res.data
    },
  })
}

export default function GroupDetailPage() {
  const { id = '' } = useParams()
  const { data: group, isLoading: groupLoading } = useGroupDetail(id)
  const { data: outings, isLoading: outingsLoading } = useOutings(id)

  if (groupLoading) return <p className="text-muted-foreground">Loading…</p>
  if (!group) return <p className="text-destructive">Group not found.</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {group.description && (
          <p className="text-muted-foreground mt-1">{group.description}</p>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Outings
          </h2>
          <CreateOutingModal groupId={id} />
        </div>

        {outingsLoading && (
          <p className="text-muted-foreground text-sm">Loading outings…</p>
        )}

        {outings && outings.length === 0 && (
          <p className="text-muted-foreground text-sm">No outings yet. Create one!</p>
        )}

        {outings && outings.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {outings.map(outing => (
              <Link key={outing.id} to={`/outings/${outing.id}`}>
                <Card className="p-4 hover:border-primary/50 transition-colors">
                  <CardHeader className="p-0">
                    <CardTitle className="text-base">{outing.title}</CardTitle>
                    {outing.description && (
                      <CardDescription className="line-clamp-2">
                        {outing.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <p className="text-xs text-muted-foreground mt-2 capitalize">{outing.status}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="h-4 w-4" />
          Members ({group.members.length})
        </h2>
        <ul className="space-y-2">
          {group.members.map(m => (
            <li key={m.userId} className="flex items-center justify-between text-sm">
              <span>{m.user.name}</span>
              <span className="text-muted-foreground capitalize">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
