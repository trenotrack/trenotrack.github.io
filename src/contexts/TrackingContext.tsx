import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  ensurePushSubscription,
  isPushSupported,
  listTrackedTrains,
  trackTrain,
  trainKey,
  untrackTrain,
  TrackPayload,
} from '@/lib/tracking';

interface TrackingContextValue {
  trackedKeys: Set<string>;
  isTracking: (trainNumber: number, dataPartenza: number) => boolean;
  toggleTracking: (payload: TrackPayload) => Promise<void>;
  pushSupported: boolean;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const [trackedKeys, setTrackedKeys] = useState<Set<string>>(new Set());
  const pushSupported = isPushSupported();

  // Load existing tracked trains on mount
  useEffect(() => {
    listTrackedTrains()
      .then(setTrackedKeys)
      .catch(() => {});
  }, []);

  const isTracking = useCallback(
    (n: number, d: number) => trackedKeys.has(trainKey(n, d)),
    [trackedKeys],
  );

  const toggleTracking = useCallback(
    async (p: TrackPayload) => {
      const key = trainKey(p.trainNumber, p.dataPartenza);
      const currentlyTracking = trackedKeys.has(key);

      if (currentlyTracking) {
        try {
          await untrackTrain(p.trainNumber, p.dataPartenza);
          setTrackedKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          toast.success('Tracking disattivato');
        } catch (e) {
          toast.error('Impossibile disattivare il tracking');
        }
        return;
      }

      // Activate: ensure subscription first
      try {
        await ensurePushSubscription();
      } catch (e: any) {
        toast.error(e?.message || 'Impossibile attivare le notifiche');
        return;
      }

      try {
        await trackTrain(p);
        setTrackedKeys((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        toast.success('Tracking attivato. Riceverai notifiche.');
      } catch {
        toast.error('Impossibile attivare il tracking');
      }
    },
    [trackedKeys],
  );

  return (
    <TrackingContext.Provider value={{ trackedKeys, isTracking, toggleTracking, pushSupported }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider');
  return ctx;
}
