import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn(
      'animate-pulse rounded-md bg-muted',
      className
    )} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <LoadingSkeleton className="h-4 w-1/2" />
      <LoadingSkeleton className="h-8 w-3/4" />
      <LoadingSkeleton className="h-3 w-1/3" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <LoadingSkeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
