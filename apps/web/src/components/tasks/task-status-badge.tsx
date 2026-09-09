import { Badge } from '@/components/ui/badge';

const SOLID = new Set(['ACTIVE']);

export function TaskStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={SOLID.has(status) ? 'dot' : 'outline'} dot={SOLID.has(status)}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
