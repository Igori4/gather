import { Users } from 'lucide-react'
import { useGroups } from '@/hooks/useGroups'
import { GroupCard } from '@/components/groups/GroupCard'
import { CreateGroupModal } from '@/components/groups/CreateGroupModal'

export default function GroupListPage() {
  const { data: groups, isLoading, isError } = useGroups()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your groups</h1>
        <CreateGroupModal />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading groups…</p>}

      {isError && <p className="text-sm text-destructive">Could not load groups.</p>}

      {groups && groups.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            You&apos;re not in any groups yet. Create one to start planning outings.
          </p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}
