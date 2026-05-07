import * as React from 'react';
import { cn } from '../../lib/utils';

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="alert" className={cn('rounded-md border border-border bg-card px-4 py-3 text-sm', className)} {...props} />;
}
