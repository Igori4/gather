import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateGroupSchema, type UpdateGroupInput } from '@gather/shared'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { useOutings } from '@/hooks/useOutings'
import { CreateOutingModal } from '@/components/outings/CreateOutingModal'
import { Users, CalendarDays, Pencil } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)

  const { data: group, isLoading: groupLoading } = useGroupDetail(id)
  const { data: outings, isLoading: outingsLoading } = useOutings(id)

  const [editOpen, setEditOpen] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const myRole = group?.members.find(m => m.userId === user?.id)?.role
  const isAdmin = myRole === 'admin'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateGroupInput>({
    resolver: zodResolver(UpdateGroupSchema),
  })

  const updateGroup = useMutation({
    mutationFn: (data: UpdateGroupInput) => api.patch(`/api/groups/${id}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] })
      setEditOpen(false)
    },
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/groups/${id}/members/${userId}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] })
    },
  })

  const leaveGroup = useMutation({
    mutationFn: () => api.delete(`/api/groups/${id}/members/me`).then(r => r.data),
    onSuccess: () => {
      navigate('/groups')
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setLeaveError(err.response?.data?.error ?? 'Failed to leave group')
    },
  })

  function openEdit() {
    reset({ name: group?.name, description: group?.description ?? undefined })
    setEditOpen(true)
  }

  if (groupLoading) return <p className="text-muted-foreground">Loading…</p>
  if (!group) return <p className="text-destructive">Group not found.</p>

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground mt-1">{group.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => { setLeaveError(null); leaveGroup.mutate() }}
            disabled={leaveGroup.isPending}
          >
            Leave group
          </Button>
        </div>
      </div>

      {leaveError && <p className="text-sm text-destructive">{leaveError}</p>}

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
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground capitalize">{m.role}</span>
                {isAdmin && m.userId !== user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-destructive hover:text-destructive text-xs"
                    onClick={() => removeMember.mutate(m.userId)}
                    disabled={removeMember.isPending}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit group</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(data => updateGroup.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>
            {updateGroup.isError && (
              <p className="text-xs text-destructive">Failed to update group</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || updateGroup.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
