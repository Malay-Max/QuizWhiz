
"use client";

import { useEffect, useState } from 'react';
import { SummaryStats } from '@/components/quiz/SummaryStats';
import { getQuizSession } from '@/lib/storage'; // clearQuizSession removed for now
import type { QuizSession } from '@/types';
import { Loader2 } from 'lucide-react';

export default function SummaryPage() {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      const loadedSession = await getQuizSession(); // Now async
      if (loadedSession && loadedSession.status === 'completed') {
        setSession(loadedSession);
      }
      setIsLoading(false);
      // Do not auto-clear session from Firestore here, let user start a new quiz to clear active ID
    };
    loadSession();
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
