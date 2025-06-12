"use client";

import { useEffect, useState } from 'react';
import { SummaryStats } from '@/components/quiz/SummaryStats';
import { getQuizSession, clearQuizSession } from '@/lib/storage';
import type { QuizSession } from '@/types';
import { Loader2 } from 'lucide-react';

export default function SummaryPage() {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadedSession = getQuizSession();
    if (loadedSession && loadedSession.status === 'completed') {
      setSession(loadedSession);
    }
    setIsLoading(false);
    
    // Optionally clear the session after viewing summary,
    // or keep it until user starts a new quiz.
    // For now, let's clear it to avoid accidental resume of a completed quiz.
    // clearQuizSession(); // Decided against auto-clearing, let user decide via new quiz
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Summary...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center py-8">
      <SummaryStats session={session} />
    </div>
  );
}
