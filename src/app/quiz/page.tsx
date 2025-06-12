
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuizSession, QuizAnswer } from '@/types';
import { getQuestions, saveQuizSession, getQuizSession, clearQuizSession } from '@/lib/storage';
import { CategorySelector } from '@/components/quiz/CategorySelector'; // Changed from TagSelector
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function QuizPage() {
  const router = useRouter();
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionsForCategory, setQuestionsForCategory] = useState<Question[]>([]); // Renamed

  const loadActiveSession = useCallback(() => {
    const activeSession = getQuizSession();
    if (activeSession && activeSession.status === 'active') {
      setQuizSession(activeSession);
      const allQuestions = getQuestions();
      setQuestionsForCategory(allQuestions.filter(q => q.category === activeSession.category && activeSession.questions.find(sq => sq.id === q.id)));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  const startQuiz = (category: string) => { // Changed parameter name
    setIsLoading(true);
    const allQuestions = getQuestions();
    const filteredQuestions = allQuestions.filter(q => q.category === category); // Changed filter logic
    
    if (filteredQuestions.length === 0) {
      alert(`No questions found for the category "${category}". Please select another category or add questions.`);
      setIsLoading(false);
      return;
    }

    const shuffledQuestions = [...filteredQuestions].sort(() => Math.random() - 0.5);

    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      category, // Changed from tag
      questions: shuffledQuestions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      status: 'active',
    };
    saveQuizSession(newSession);
    setQuizSession(newSession);
    setQuestionsForCategory(shuffledQuestions);
    setIsLoading(false);
  };

  const handleAnswer = (selectedAnswerId: string, timeTaken: number) => {
     setQuizSession(prevSession => {
      if (!prevSession || prevSession.currentQuestionIndex >= questionsForCategory.length) {
        return prevSession;
      }
      const currentQuestion = questionsForCategory[prevSession.currentQuestionIndex];
      if (!currentQuestion) {
        return prevSession;
      }

      if (prevSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
        return prevSession; 
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
      if (!prevSession || prevSession.currentQuestionIndex >= questionsForCategory.length) {
        return prevSession;
      }
      const currentQuestion = questionsForCategory[prevSession.currentQuestionIndex];
      if (!currentQuestion) {
        return prevSession;
      }
      
      if (prevSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
        return prevSession; 
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
      if (nextIndex < questionsForCategory.length) {
        const updatedSession = { ...prevSession, currentQuestionIndex: nextIndex };
        saveQuizSession(updatedSession);
        return updatedSession;
      } else {
        const completedSession = { 
          ...prevSession, 
          status: 'completed' as 'completed',
          endTime: Date.now() 
        };
        saveQuizSession(completedSession);
        router.push('/summary'); // Navigate after state is set
        return completedSession;
      }
    });
  };
  
  const handleRestartQuiz = () => {
    clearQuizSession();
    setQuizSession(null);
    setQuestionsForCategory([]);
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
    return <CategorySelector onSelectCategory={startQuiz} />; // Changed component and prop
  }

  const currentQuestion = questionsForCategory[quizSession.currentQuestionIndex];

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
        totalQuestions={questionsForCategory.length}
      />
       <Button onClick={handleRestartQuiz} variant="outline" className="mt-8">
        <RotateCcw className="mr-2 h-4 w-4" /> Select Different Quiz
      </Button>
    </div>
  );
}
