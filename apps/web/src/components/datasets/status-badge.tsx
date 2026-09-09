import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { variant: 'solid' | 'outline'; dot?: boolean; muted?: boolean }> = {
  READY: { variant: 'solid', dot: true },
  PROCESSING: { variant: 'outline', dot: true },
  PENDING: { variant: 'outline', dot: true },
  FAILED: { variant: 'outline', muted: true },
  ARCHIVED: { variant: 'outline', muted: true },
};

export function DatasetStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { variant: 'outline' as const };
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <Badge
      variant={style.variant}
      dot={style.dot}
      className={cn(style.muted && 'border-ink-300 text-ink-400')}
    >
      {label}
    </Badge>
  );
}
