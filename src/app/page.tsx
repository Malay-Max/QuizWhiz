
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuizSession, QuizAnswer } from '@/types';
import { getQuestions, saveQuizSession, getQuizSession, clearQuizSession } from '@/lib/storage';
import { TagSelector } from '@/components/quiz/TagSelector';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function QuizPage() {
  const router = useRouter();
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionsForTag, setQuestionsForTag] = useState<Question[]>([]);

  const loadActiveSession = useCallback(() => {
    const activeSession = getQuizSession();
    if (activeSession && activeSession.status === 'active') {
      setQuizSession(activeSession);
      const allQuestions = getQuestions();
      setQuestionsForTag(allQuestions.filter(q => q.tags.includes(activeSession.tag) && activeSession.questions.find(sq => sq.id === q.id)));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  // Effect to handle navigation when quiz is completed
  useEffect(() => {
    if (quizSession?.status === 'completed') {
      router.push('/summary');
    }
  }, [quizSession?.status, router]);

  const startQuiz = (tag: string) => {
    setIsLoading(true);
    const allQuestions = getQuestions();
    const filteredQuestions = allQuestions.filter(q => q.tags.includes(tag));
    
    if (filteredQuestions.length === 0) {
      alert(`No questions found for the tag "${tag}". Please select another tag or add questions.`);
      setIsLoading(false);
      return;
    }

    const shuffledQuestions = [...filteredQuestions].sort(() => Math.random() - 0.5);

    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      tag,
      questions: shuffledQuestions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      status: 'active',
    };
    saveQuizSession(newSession);
    setQuizSession(newSession);
    setQuestionsForTag(shuffledQuestions);
    setIsLoading(false);
  };

  const handleAnswer = (selectedAnswerId: string, timeTaken: number) => {
    setQuizSession(prevSession => {
      if (!prevSession || prevSession.currentQuestionIndex >= questionsForTag.length) {
        return prevSession;
      }
      const currentQuestion = questionsForTag[prevSession.currentQuestionIndex];
      if (!currentQuestion) {
        return prevSession;
      }

      // Check if an answer for this question already exists
      if (prevSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
        return prevSession; // Already answered, ignore subsequent calls
      }

      const isCorrect = currentQuestion.correctAnswerId === selectedAnswerId;
      const newAnswer: QuizAnswer = {
        questionId: currentQuestion.id,
        selectedAnswerId,
        isCorrect,
        timeTaken,
        skipped: false,
      };
      
      const updatedAnswers = [...prevSession.answers, newAnswer];
      const updatedSession = { ...prevSession, answers: updatedAnswers };
      
      saveQuizSession(updatedSession);
      return updatedSession;
    });
  };

  const handleTimeout = (timeTaken: number) => {
    setQuizSession(prevSession => {
      if (!prevSession || prevSession.currentQuestionIndex >= questionsForTag.length) {
        return prevSession;
      }
      const currentQuestion = questionsForTag[prevSession.currentQuestionIndex];
      if (!currentQuestion) {
        return prevSession;
      }
      
      // Check if an answer for this question already exists
      if (prevSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
        return prevSession; // Already answered or skipped, ignore subsequent calls
      }

      const newAnswer: QuizAnswer = {
        questionId: currentQuestion.id,
        timeTaken,
        skipped: true,
      };
      
      const updatedAnswers = [...prevSession.answers, newAnswer];
      const updatedSession = { ...prevSession, answers: updatedAnswers };

      saveQuizSession(updatedSession);
      return updatedSession;
    });
  };

  const handleNextQuestion = () => {
    setQuizSession(prevSession => {
      if (!prevSession) return prevSession;

      const nextIndex = prevSession.currentQuestionIndex + 1;
      if (nextIndex < questionsForTag.length) {
        const updatedSession = { ...prevSession, currentQuestionIndex: nextIndex };
        saveQuizSession(updatedSession);
        return updatedSession;
      } else {
        // Quiz finished, mark as completed
        const completedSession = { 
          ...prevSession, 
          status: 'completed' as 'completed',
          endTime: Date.now() 
        };
        saveQuizSession(completedSession);
        // Navigation will be handled by the useEffect hook watching quizSession.status
        return completedSession;
      }
    });
  };
  
  const handleRestartQuiz = () => {
    clearQuizSession();
    setQuizSession(null);
    setQuestionsForTag([]);
    setIsLoading(true); 
    setTimeout(() => setIsLoading(false), 50);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Quiz...</p>
      </div>
    );
  }

  if (!quizSession || quizSession.status !== 'active') {
    return <TagSelector onSelectTag={startQuiz} />;
  }
  
  if (quizSession.currentQuestionIndex >= questionsForTag.length && quizSession.status === 'active') {
     // This case can happen if somehow currentQuestionIndex is out of bounds but status is not yet completed
     // Or if questionsForTag is empty after session started (unlikely with current checks but good to be safe)
     // We should transition to completed status if not already.
     const completedSession = { 
        ...quizSession, 
        status: 'completed' as 'completed',
        endTime: quizSession.endTime || Date.now() 
      };
      saveQuizSession(completedSession);
      setQuizSession(completedSession); // Update local state to trigger useEffect for navigation
      // The useEffect will handle navigation to /summary
     return ( // Show a loading or transitional state until navigation happens
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Finalizing Quiz...</p>
      </div>
    );
  }


  const currentQuestion = questionsForTag[quizSession.currentQuestionIndex];

  if (!currentQuestion && quizSession.status === 'active') {
     // This is an error state: active quiz but no current question.
     // Could be due to data corruption or unexpected state.
     return (
      <Card className="w-full max-w-md mx-auto text-center shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground bg-destructive p-4 rounded-md">
            Could not load the current question. The quiz data might be corrupted.
          </p>
          <Button onClick={handleRestartQuiz} className="mt-6 w-full" variant="destructive">
            <RotateCcw className="mr-2 h-4 w-4" /> Restart Quiz Selection
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // If session is not active (e.g., completed but navigation hasn't happened yet), don't render QuestionCard
  if (quizSession.status !== 'active' || !currentQuestion) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center">
      <QuestionCard
        key={currentQuestion.id} 
        question={currentQuestion}
        onAnswer={handleAnswer}
        onTimeout={handleTimeout}
        onNext={handleNextQuestion}
        questionNumber={quizSession.currentQuestionIndex + 1}
        totalQuestions={questionsForTag.length}
      />
       <Button onClick={handleRestartQuiz} variant="outline" className="mt-8">
        <RotateCcw className="mr-2 h-4 w-4" /> Select Different Quiz
      </Button>
    </div>
  );
}

