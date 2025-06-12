
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
  isExternallyAnsweredRef?: React.RefObject<boolean>; // New prop
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
      // Check the external ref before calling onTimeout
      if (isExternallyAnsweredRef?.current) {
        return;
      }
      onTimeout();
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        // Check the external ref inside setInterval as well, as timeLeft could reach 0 here
        if (isExternallyAnsweredRef?.current) {
           if(intervalRef.current) clearInterval(intervalRef.current);
           return prevTime; // Keep current time, effectively pausing
        }
        if (prevTime -1 <= 0) {
            if(intervalRef.current) clearInterval(intervalRef.current);
             // Check ref again before final onTimeout call from interval
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
    <div className="w-full p-3 bg-card border rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-1.5" />
          Time Remaining
        </div>
        <div className="text-lg font-semibold font-mono tabular-nums">
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
          {String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>
      <Progress value={progressPercentage} className="h-2" />
    </div>
  );
}
