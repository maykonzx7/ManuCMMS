import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  colorClass: string
  className?: string
}

export function StatusBadge({ status, colorClass, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium',
        colorClass,
        className
      )}
    >
      {status}
    </span>
  )
}
