import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainSearchProps {
  onSearch: (trainNumber: string) => void;
  isLoading?: boolean;
}

export function TrainSearch({ onSearch, isLoading }: TrainSearchProps) {
  const [trainNumber, setTrainNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trainNumber.trim()) {
      onSearch(trainNumber.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={trainNumber}
        onChange={(e) => setTrainNumber(e.target.value.replace(/\D/g, ''))}
        placeholder="12345"
        className="w-full h-14 px-5 pr-14 text-base bg-muted border-0 rounded-2xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 tabular-nums"
      />
      <button 
        type="submit" 
        disabled={!trainNumber.trim() || isLoading}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl transition-all",
          trainNumber.trim() 
            ? "bg-foreground text-background" 
            : "bg-muted-foreground/20 text-muted-foreground"
        )}
      >
        <ArrowRight className="h-5 w-5" />
      </button>
    </form>
  );
}
