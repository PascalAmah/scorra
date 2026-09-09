import { cn } from '@/lib/utils';

export function Viewfinder({ className }: { className?: string }) {
  const corner = 'pointer-events-none absolute h-[18px] w-[18px] border-current';
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
    >
      <span className={cn(corner, '-top-px -left-px border-t-2 border-l-2')} />
      <span className={cn(corner, '-top-px -right-px border-t-2 border-r-2')} />
      <span className={cn(corner, '-bottom-px -left-px border-b-2 border-l-2')} />
      <span className={cn(corner, '-bottom-px -right-px border-b-2 border-r-2')} />
    </div>
  );
}
