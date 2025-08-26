
"use client";

import { useState, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

interface TimerProps {
  duration: number; // in seconds
  onTimeout: () => void;
  onTick?: (timeLeft: number) => void;
  isPaused: boolean;
  resetKey?: string | number; 
  isExternallyAnsweredRef?: React.RefObject<boolean>; 
}

export function Timer({ duration, onTimeout, onTick, isPaused, resetKey, isExternallyAnsweredRef }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeLeft(duration); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, resetKey]);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // This handles the resume case.
    if (!intervalRef.current && timeLeft > 0) {
        intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
            const newTime = prevTime - 1;
            if (isExternallyAnsweredRef?.current) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return prevTime;
            }
            if (newTime <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (!isExternallyAnsweredRef?.current) {
                onTimeout();
            }
            return 0;
            }
            return newTime;
        });
        }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, timeLeft, duration, onTimeout, isExternallyAnsweredRef]);

  useEffect(() => {
    if (onTick) {
      onTick(timeLeft);
    }
  }, [timeLeft, onTick]);

  const progressPercentage = (timeLeft / duration) * 100;

  return (
    <div className="w-full p-1 sm:p-1.5 bg-card border rounded-lg shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-muted-foreground" />
        <div className="flex flex-1 items-baseline justify-between">
          <span className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">Time Remaining</span>
          <span className="text-base sm:text-lg font-semibold font-mono tabular-nums">
            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
            {String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
      </div>
      <Progress value={progressPercentage} className="h-1 sm:h-1.5" />
    </div>
  );
}

    