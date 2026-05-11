import { LineBadgeInfo } from '@/lib/trainLines';
import { cn } from '@/lib/utils';

interface LineBadgeProps {
  badge: LineBadgeInfo;
  className?: string;
}

export function LineBadge({ badge, className }: LineBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide leading-none shrink-0',
        className,
      )}
      style={{ backgroundColor: badge.bgColor, color: badge.textColor }}
    >
      {badge.label}
    </span>
  );
}
