
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuizSession, QuizAnswer } from '@/types';
import { getQuestions, saveQuizSession, getQuizSession, clearQuizSession } from '@/lib/storage';
import { CategorySelector } from '@/components/quiz/CategorySelector';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function QuizPage() {
  const router = useRouter();
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionsForCategory, setQuestionsForCategory] = useState<Question[]>([]);

  const loadActiveSession = useCallback(() => {
    const activeSession = getQuizSession();
    if (activeSession && activeSession.status === 'active') {
      setQuizSession(activeSession);
      const allQuestions = getQuestions();
      // For nested categories, if a session was for "Science", it includes "Science/Physics"
      // The questions in the session are already filtered, so we just find them by ID.
      setQuestionsForCategory(activeSession.questions);
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

  const startQuiz = (selectedCategoryPath: string) => {
    setIsLoading(true);
    const allQuestions = getQuestions();
    // Filter questions: include if question's category starts with the selected path
    // e.g., if selectedCategoryPath is "Science", include "Science", "Science/Physics", "Science/Chemistry"
    const filteredQuestions = allQuestions.filter(q => q.category.startsWith(selectedCategoryPath));
    
    if (filteredQuestions.length === 0) {
      alert(`No questions found for the category "${selectedCategoryPath}" or its sub-categories. Please select another category or add questions.`);
      setIsLoading(false);
      return;
    }

    const shuffledQuestions = [...filteredQuestions].sort(() => Math.random() - 0.5);

    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      category: selectedCategoryPath,
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

      // Prevent duplicate answers for the same question
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
      
      // Prevent duplicate answers (e.g. if timeout happens after manual answer)
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
        // This is the last question, mark as completed
        const completedSession = { 
          ...prevSession, 
          status: 'completed' as 'completed',
          endTime: Date.now() // Set end time
        };
        saveQuizSession(completedSession);
        // Navigation to /summary will be handled by useEffect
        return completedSession;
      }
    });
  };
  
  const handleRestartQuiz = () => {
    clearQuizSession();
    setQuizSession(null);
    setQuestionsForCategory([]);
    setIsLoading(true); 
    // Short delay to ensure state reset before CategorySelector re-evaluates
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
    return <CategorySelector onSelectCategory={startQuiz} />;
  }
  
  // This case should ideally be caught by the useEffect navigating to /summary
  // or by the next condition if currentQuestionIndex is out of bounds.
  if (quizSession.currentQuestionIndex >= questionsForCategory.length && quizSession.status === 'active') {
     // Attempt to finalize, but useEffect should catch 'completed' status for navigation
     const completedSession = { 
        ...quizSession, 
        status: 'completed' as 'completed',
        endTime: quizSession.endTime || Date.now() 
      };
      saveQuizSession(completedSession);
      setQuizSession(completedSession); // This should trigger the useEffect for navigation
     // Show a loader while the useEffect picks up the change and navigates
     return ( 
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Finalizing Quiz...</p>
      </div>
    );
  }


  const currentQuestion = questionsForCategory[quizSession.currentQuestionIndex];

  // If currentQuestion is undefined, but session is active, it's an error state
  if (!currentQuestion && quizSession.status === 'active') {
     // This might indicate an issue with questionsForCategory or currentQuestionIndex
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
  
  // General loading/error state if quiz session status is not 'active' or question is missing
  // This should ideally not be hit if other conditions are correctly handled.
  if (quizSession.status !== 'active' || !currentQuestion) {
     // Fallback loader, implies an unexpected state
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
        key={currentQuestion.id} // Ensure QuestionCard re-mounts/re-initializes for new questions
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
