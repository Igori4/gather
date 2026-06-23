import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import type { Group } from '@/api/groups'

export function GroupCard({ group }: { group: Group }) {
  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="p-6 h-full flex flex-col justify-between hover:border-primary/50 transition-colors">
        <CardHeader className="p-0">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          {group.description && (
            <CardDescription className="line-clamp-2">{group.description}</CardDescription>
          )}
        </CardHeader>
        <CardFooter className="p-0 mt-4 text-sm text-muted-foreground gap-1.5">
          <Users className="h-4 w-4" />
          {group._count.members} {group._count.members === 1 ? 'member' : 'members'}
        </CardFooter>
      </Card>
    </Link>
  )
}
