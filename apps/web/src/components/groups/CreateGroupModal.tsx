import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateGroupSchema, type CreateGroupInput } from '@gather/shared'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateGroup } from '@/hooks/useGroups'

// Backend error responses are always `{ error: string | ZodFlattenedError }`
// (see apps/api/src/routes/groups.ts and middleware/auth.ts) — never `message`.
function extractErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Could not create group'
  const body = error.response?.data?.error
  if (typeof body === 'string') return body
  const firstFieldError = Object.values(body?.fieldErrors ?? {}).flat()[0]
  if (typeof firstFieldError === 'string') return firstFieldError
  return 'Could not create group'
}

export function CreateGroupModal() {
  const [open, setOpen] = useState(false)
  const mutation = useCreateGroup()

  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(CreateGroupSchema),
    defaultValues: { name: '', description: '' },
  })

  async function onSubmit(data: CreateGroupInput) {
    try {
      await mutation.mutateAsync(data)
      form.reset()
      setOpen(false)
    } catch {
      // error displayed via mutation.error below
    }
  }

  const errorMessage = mutation.error ? extractErrorMessage(mutation.error) : null

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) form.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>Create group</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a group</DialogTitle>
          <DialogDescription>
            Start planning outings with friends — you can invite members after.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekend Crew" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What's this group about?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create group'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
