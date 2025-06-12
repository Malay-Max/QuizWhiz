
"use client";

import { useState, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

interface TimerProps {
  duration: number; // in seconds
  onTimeout: () => void;
  onTick?: (timeLeft: number) => void;
  isPaused: boolean;
  resetKey?: string | number; // Add a key to force reset
}

export function Timer({ duration, onTimeout, onTick, isPaused, resetKey }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeLeft(duration); // Reset timer when resetKey changes or on initial mount
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
      onTimeout();
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, timeLeft, duration, onTimeout]);

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
