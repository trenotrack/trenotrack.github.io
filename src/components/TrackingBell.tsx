import { Bell, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTracking } from '@/contexts/TrackingContext';
import { TrackPayload } from '@/lib/tracking';
import { MouseEvent } from 'react';

interface TrackingBellProps {
  payload: TrackPayload;
  className?: string;
  size?: 'sm' | 'md';
}

export function TrackingBell({ payload, className, size = 'sm' }: TrackingBellProps) {
  const { isTracking, toggleTracking } = useTracking();
  const active = isTracking(payload.trainNumber, payload.dataPartenza);

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void toggleTracking(payload);
  };

  const Icon = active ? BellRing : Bell;
  const dim = size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const iconSize = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? 'Disattiva tracking' : 'Attiva tracking'}
      className={cn(
        'flex items-center justify-center rounded-full transition-colors shrink-0',
        dim,
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-muted-foreground',
        className,
      )}
    >
      <Icon className={iconSize} />
    </button>
  );
}
