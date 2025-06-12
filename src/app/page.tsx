
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuizSession, QuizAnswer } from '@/types';
import { getQuestions, saveQuizSession, getQuizSession, clearQuizSession, deleteQuestionById } from '@/lib/storage';
import { CategorySelector } from '@/components/quiz/CategorySelector';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export default function QuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionsForCategory, setQuestionsForCategory] = useState<Question[]>([]);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  const loadActiveSession = useCallback(() => {
    const activeSession = getQuizSession();
    if (activeSession && activeSession.status === 'active') {
      setQuizSession(activeSession);
      // Ensure questionsForCategory is also initialized from the loaded session
      setQuestionsForCategory(activeSession.questions || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  useEffect(() => {
    if (quizSession?.status === 'completed') {
      router.push('/summary');
    }
  }, [quizSession]);

  const startQuiz = (selectedCategoryPath: string) => {
    setIsLoading(true);
    const allQuestions = getQuestions();
    // Filter questions: include if question's category starts with the selected path
    // e.g., if selectedCategoryPath is "Science", include "Science", "Science/Physics", "Science/Chemistry"
    const filteredQuestions = allQuestions.filter(q => typeof q.category === 'string' && q.category.startsWith(selectedCategoryPath));
    
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
      if (!prevSession) return prevSession;
      // Ensure questionsForCategory is derived from the session being updated
      const currentQuestions = prevSession.questions || [];
      if (prevSession.currentQuestionIndex >= currentQuestions.length) {
        return prevSession;
      }
      const currentQuestion = currentQuestions[prevSession.currentQuestionIndex];
      if (!currentQuestion) {
        return prevSession;
      }

      // Check if an answer for this question already exists
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
      if (!prevSession) return prevSession;
      // Ensure questionsForCategory is derived from the session being updated
      const currentQuestions = prevSession.questions || [];
      if (prevSession.currentQuestionIndex >= currentQuestions.length) {
        return prevSession;
      }
      const currentQuestion = currentQuestions[prevSession.currentQuestionIndex];
      if (!currentQuestion) {
        return prevSession;
      }
      
      // Check if an answer for this question already exists
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
      // Ensure questionsForCategory is derived from the session being updated
      const currentQuestions = prevSession.questions || [];
      const nextIndex = prevSession.currentQuestionIndex + 1;

      if (nextIndex < currentQuestions.length) {
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
        // Navigation will be handled by useEffect watching quizSession.status
        return completedSession;
      }
    });
  };
  
  const handleRestartQuiz = () => {
    clearQuizSession();
    setQuizSession(null);
    setQuestionsForCategory([]);
    setIsLoading(true); 
    setTimeout(() => setIsLoading(false), 50); // Brief delay to re-trigger loader and category selector
  };

  const handleDeleteCurrentQuestionDialog = () => {
    setShowDeleteConfirmDialog(true);
  };

  const handleConfirmDeleteCurrentQuestion = () => {
    if (!quizSession || questionsForCategory.length === 0) return;
    
    const currentQuestionToDelete = questionsForCategory[quizSession.currentQuestionIndex];
    if (!currentQuestionToDelete) {
        toast({ title: "Error", description: "Could not identify question to delete.", variant: "destructive" });
        setShowDeleteConfirmDialog(false);
        return;
    }

    deleteQuestionById(currentQuestionToDelete.id);

    setQuizSession(prevSession => {
        if (!prevSession) return null;

        const updatedQuestionsArray = prevSession.questions.filter(q => q.id !== currentQuestionToDelete.id);
        setQuestionsForCategory(updatedQuestionsArray); // Keep this page state in sync

        if (updatedQuestionsArray.length === 0 || prevSession.currentQuestionIndex >= updatedQuestionsArray.length) {
            // No questions left, or the deleted question was the last one being displayed
            const completedSession: QuizSession = {
                ...prevSession,
                questions: updatedQuestionsArray,
                answers: prevSession.answers.filter(ans => updatedQuestionsArray.some(q => q.id === ans.questionId)),
                currentQuestionIndex: 0,
                status: 'completed',
                endTime: Date.now(),
            };
            saveQuizSession(completedSession);
            return completedSession;
        }

        // Current index is still valid for the new array, effectively shows the next question
        const updatedSession: QuizSession = {
            ...prevSession,
            questions: updatedQuestionsArray,
            answers: prevSession.answers.filter(ans => updatedQuestionsArray.some(q => q.id === ans.questionId)),
            // currentQuestionIndex remains the same as the array shifts.
            // If it was item 0 and deleted, new item 0 is the next.
            currentQuestionIndex: prevSession.currentQuestionIndex, 
            status: 'active',
        };
        saveQuizSession(updatedSession);
        return updatedSession;
    });

    setShowDeleteConfirmDialog(false);
    toast({
        title: "Question Deleted",
        description: `The question "${currentQuestionToDelete.text.substring(0,30)}..." has been removed.`,
        variant: "default",
    });
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
  
  // This condition needs to check based on questionsForCategory derived from quizSession
  if (quizSession.questions.length === 0 || quizSession.currentQuestionIndex >= quizSession.questions.length) {
     if (quizSession.status === 'active') { // Only try to complete if it was active
        const completedSession = { 
            ...quizSession, 
            status: 'completed' as 'completed',
            endTime: quizSession.endTime || Date.now() 
        };
        // Check if already completing to prevent loop if router.push is delayed
        if (quizSession.id && getQuizSession()?.id === quizSession.id && getQuizSession()?.status !== 'completed') {
            saveQuizSession(completedSession);
            setQuizSession(completedSession); // This will trigger useEffect for navigation
        }
     }
     // Show loader while transitioning to summary
     return ( 
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Finalizing Quiz...</p>
      </div>
    );
  }

  const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];

  if (!currentQuestion) { // Should be caught by above block, but as a safeguard
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
    <>
      <div className="flex flex-col items-center">
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          onAnswer={handleAnswer}
          onTimeout={handleTimeout}
          onNext={handleNextQuestion}
          questionNumber={quizSession.currentQuestionIndex + 1}
          totalQuestions={quizSession.questions.length}
        />
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full max-w-3xl justify-center">
          <Button onClick={handleRestartQuiz} variant="outline" className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" /> Select Different Quiz
          </Button>
          <Button onClick={handleDeleteCurrentQuestionDialog} variant="destructive" className="flex-1">
            <Trash2 className="mr-2 h-4 w-4" /> Delete This Question
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question: <br />
              <strong className="text-primary font-semibold">
                {quizSession?.questions[quizSession.currentQuestionIndex]?.text.substring(0, 70)}
                {quizSession && quizSession.questions[quizSession.currentQuestionIndex]?.text.length > 70 ? '...' : ''}
              </strong>
              <br /> from your library and remove it from the current quiz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCurrentQuestion} className="bg-destructive hover:bg-destructive/90">
              Delete Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
