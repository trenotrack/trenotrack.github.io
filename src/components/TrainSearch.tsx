import { useState } from 'react';
import { Search, Train } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Train className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={trainNumber}
          onChange={(e) => setTrainNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="Numero treno..."
          className="pl-10 h-12 text-base bg-card"
        />
      </div>
      <Button 
        type="submit" 
        size="lg" 
        className="h-12 px-6"
        disabled={!trainNumber.trim() || isLoading}
      >
        <Search className="h-5 w-5" />
      </Button>
    </form>
  );
}
