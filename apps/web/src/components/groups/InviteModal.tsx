import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { InviteMemberSchema, type InviteMemberInput } from '@gather/shared'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'

interface Props {
  groupId: string
}

export function InviteModal({ groupId }: Props) {
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(InviteMemberSchema),
    defaultValues: { role: 'member' },
  })

  const invite = useMutation({
    mutationFn: (data: InviteMemberInput) =>
      api.post(`/api/groups/${groupId}/invite`, data).then(r => r.data),
    onSuccess: () => {
      reset()
      setOpen(false)
    },
  })

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
        Invite
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(data => invite.mutate(data))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                {...register('role')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {invite.isError && (
              <p className="text-xs text-destructive">
                {(invite.error as { response?: { data?: { error?: string } } })?.response?.data
                  ?.error ?? 'Failed to send invite'}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || invite.isPending}>
                {invite.isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
