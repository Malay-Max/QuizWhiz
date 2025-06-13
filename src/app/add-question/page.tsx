
"use client"; // Keep this if QuestionForm or its hooks need client-side APIs

import React, { Suspense } from 'react';
import { QuestionForm } from '@/components/quiz/QuestionForm';
import { Loader2 } from 'lucide-react';

function AddQuestionPageContent() {
  return (
    <div className="flex flex-col items-center">
      <QuestionForm />
    </div>
  );
}

export default function AddQuestionPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Form...</p>
      </div>
    }>
      <AddQuestionPageContent />
    </Suspense>
  );
}
