import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateOutingSchema, type CreateOutingInput } from '@gather/shared'
import { useCreateOuting } from '@/hooks/useOutings'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'

export function CreateOutingModal({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useCreateOuting(groupId)

  const form = useForm<CreateOutingInput>({
    resolver: zodResolver(CreateOutingSchema),
    defaultValues: { title: '', description: '' },
  })

  function onSubmit(data: CreateOutingInput) {
    mutate(data, {
      onSuccess: () => {
        form.reset()
        setOpen(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New outing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create outing</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Pizza night" {...field} />
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
                    <Textarea placeholder="What's the plan?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
