
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
  }, [duration, resetKey]);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    if (timeLeft <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (isExternallyAnsweredRef?.current) {
        return;
      }
      onTimeout();
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (isExternallyAnsweredRef?.current) {
           if(intervalRef.current) clearInterval(intervalRef.current);
           return prevTime; 
        }
        if (prevTime -1 <= 0) {
            if(intervalRef.current) clearInterval(intervalRef.current);
            if (!isExternallyAnsweredRef?.current) {
                onTimeout();
            }
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
    <div className="w-full p-2 sm:p-3 bg-card border rounded-lg shadow-sm">
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1 mb-1 sm:mb-2">
        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
          <span className="whitespace-nowrap">Time Remaining</span>
        </div>
        <div className="text-base sm:text-lg font-semibold font-mono tabular-nums self-end xs:self-center">
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
          {String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>
      <Progress value={progressPercentage} className="h-1.5 sm:h-2" />
    </div>
  );
}
