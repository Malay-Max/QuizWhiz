
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
    if (!quizSession || quizSession.currentQuestionIndex >= questionsForTag.length) return;

    const currentQuestion = questionsForTag[quizSession.currentQuestionIndex];
    if (!currentQuestion) return;

    // Prevent duplicate answers for the same question
    if (quizSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
      // console.warn(`QuizPage: Attempted to log a second answer for question ${currentQuestion.id}. Ignoring.`);
      return; 
    }

    const isCorrect = currentQuestion.correctAnswerId === selectedAnswerId;

    const newAnswer: QuizAnswer = {
      questionId: currentQuestion.id,
      selectedAnswerId,
      isCorrect,
      timeTaken,
      skipped: false,
    };
    
    const updatedSession = {
      ...quizSession,
      answers: [...quizSession.answers, newAnswer],
    };
    setQuizSession(updatedSession); 
    saveQuizSession(updatedSession); 
  };

  const handleTimeout = (timeTaken: number) => {
    if (!quizSession || quizSession.currentQuestionIndex >= questionsForTag.length) return;

    const currentQuestion = questionsForTag[quizSession.currentQuestionIndex];
    if (!currentQuestion) return;
    
    // Prevent logging timeout if question was already answered
    if (quizSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
      // console.warn(`QuizPage: Attempted to log timeout for already answered question ${currentQuestion.id}. Ignoring.`);
      return;
    }

    const newAnswer: QuizAnswer = {
      questionId: currentQuestion.id,
      timeTaken,
      skipped: true,
    };
    
    const updatedSession = {
      ...quizSession,
      answers: [...quizSession.answers, newAnswer],
    };
    setQuizSession(updatedSession);
    saveQuizSession(updatedSession);
  };

  const handleNextQuestion = () => {
    if (!quizSession) return;

    const nextIndex = quizSession.currentQuestionIndex + 1;
    if (nextIndex < questionsForTag.length) {
      const updatedSession = { ...quizSession, currentQuestionIndex: nextIndex };
      setQuizSession(updatedSession);
      saveQuizSession(updatedSession);
    } else {
      const completedSession = { 
        ...quizSession, 
        status: 'completed' as 'completed',
        endTime: Date.now() 
      };
      setQuizSession(completedSession);
      saveQuizSession(completedSession);
      router.push('/summary');
    }
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
  
  // Ensure currentQuestionIndex is within bounds
  if (quizSession.currentQuestionIndex >= questionsForTag.length) {
     // This can happen if questionsForTag becomes empty or shrinks unexpectedly after session start.
     // Or if somehow currentQuestionIndex became too large.
     return (
      <Card className="w-full max-w-md mx-auto text-center shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Quiz Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground bg-destructive p-4 rounded-md">
            There was an issue loading the next question. The quiz may have ended or data is inconsistent.
          </p>
          <Button onClick={handleRestartQuiz} className="mt-6 w-full" variant="destructive">
            <RotateCcw className="mr-2 h-4 w-4" /> Restart Quiz Selection
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questionsForTag[quizSession.currentQuestionIndex];

  if (!currentQuestion) {
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
