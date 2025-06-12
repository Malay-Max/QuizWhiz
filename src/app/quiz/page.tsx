
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Question, QuizSession, QuizAnswer } from '@/types';
import { getQuestions, saveQuizSession, getQuizSession, clearQuizSession, deleteQuestionById, deleteQuestionsByCategory } from '@/lib/storage';
import { CategorySelector, ALL_QUESTIONS_RANDOM_KEY } from '@/components/quiz/CategorySelector';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Trash2, Library } from 'lucide-react';
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

// This page is very similar to src/app/page.tsx. 
// Consider refactoring shared quiz logic into a custom hook or utility functions if complexity grows.

export default function QuizPlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteQuestionConfirmDialog, setShowDeleteQuestionConfirmDialog] = useState(false);
  const [showDeleteCategoryConfirmDialog, setShowDeleteCategoryConfirmDialog] = useState(false);

  const loadActiveSessionOrFromParams = useCallback(() => {
    const categoryFromParams = searchParams.get('category');
    const exactMatchFromParams = searchParams.get('exact') === 'true';

    if (categoryFromParams) {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.delete('category');
      current.delete('exact');
      const query = current.toString() ? `?${current}` : '';
      router.replace(`${window.location.pathname}${query}`, {scroll: false});

      startQuiz(categoryFromParams, exactMatchFromParams);
      return;
    }

    const activeSession = getQuizSession();
    if (activeSession && activeSession.status === 'active') {
      setQuizSession(activeSession);
    }
    setIsLoading(false);
  }, [searchParams, router]);

  useEffect(() => {
    loadActiveSessionOrFromParams();
  }, [loadActiveSessionOrFromParams]);

  useEffect(() => {
    if (quizSession?.status === 'completed') {
      router.push('/summary');
    }
  }, [quizSession, router]);

  const startQuiz = (selectedCategoryPath: string, exactMatch: boolean = false) => {
    setIsLoading(true);
    const allQuestions = getQuestions();
    let filteredQuestions: Question[] = [];
    let quizCategoryName = selectedCategoryPath;

    if (selectedCategoryPath === ALL_QUESTIONS_RANDOM_KEY) {
      filteredQuestions = allQuestions;
      quizCategoryName = "All Categories (Random)";
      exactMatch = false;
    } else if (exactMatch) {
      filteredQuestions = allQuestions.filter(q => typeof q.category === 'string' && q.category === selectedCategoryPath);
      quizCategoryName = selectedCategoryPath;
    } else {
      filteredQuestions = allQuestions.filter(q => typeof q.category === 'string' && q.category.startsWith(selectedCategoryPath));
      quizCategoryName = selectedCategoryPath;
    }
    
    if (filteredQuestions.length === 0) {
      toast({
        title: "No Questions Found",
        description: `No questions found for "${quizCategoryName}". Please add questions or select a different category.`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Shuffle questions first
    const shuffledQuestions = [...filteredQuestions].sort(() => Math.random() - 0.5);
    
    // Then, for each question, shuffle its options
    const questionsWithShuffledOptions = shuffledQuestions.map(question => ({
      ...question,
      options: [...question.options].sort(() => Math.random() - 0.5),
    }));

    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      category: quizCategoryName,
      questions: questionsWithShuffledOptions, // Use questions with shuffled options
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      status: 'active',
    };
    saveQuizSession(newSession);
    setQuizSession(newSession);
    setIsLoading(false);
  };

  const handleCategoryAction = (categoryPath: string, isLeafNode: boolean) => {
    if (isLeafNode) {
      router.push(`/quiz/manage/${categoryPath.split('/').map(segment => encodeURIComponent(segment)).join('/')}`);
    } else {
      startQuiz(categoryPath, false);
    }
  };

  const handleStartRandomQuiz = () => {
    startQuiz(ALL_QUESTIONS_RANDOM_KEY, false);
  };

  const handleAnswer = (selectedAnswerId: string, timeTaken: number) => {
     setQuizSession(prevSession => {
      if (!prevSession) return prevSession;
      const currentQuestion = prevSession.questions[prevSession.currentQuestionIndex];
      if (!currentQuestion || prevSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
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
      const currentQuestion = prevSession.questions[prevSession.currentQuestionIndex];
      if (!currentQuestion || prevSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
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

      if (nextIndex < prevSession.questions.length) {
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
        return completedSession;
      }
    });
  };
  
  const handleRestartQuiz = () => {
    clearQuizSession();
    setQuizSession(null);
    setIsLoading(true); 
    setTimeout(() => setIsLoading(false), 50);
  };

  const handleDeleteCurrentQuestionDialog = () => {
    setShowDeleteQuestionConfirmDialog(true);
  };

  const handleDeleteCategoryDialog = () => {
     if (quizSession?.category === "All Categories (Random)") {
        toast({
            title: "Action Not Allowed",
            description: "Cannot delete 'All Categories (Random)' quiz. This is a dynamic collection.",
            variant: "destructive"
        });
        return;
    }
    setShowDeleteCategoryConfirmDialog(true);
  };

  const handleConfirmDeleteCurrentQuestion = () => {
    if (!quizSession || !quizSession.questions || quizSession.questions.length === 0) return;
    
    const currentQuestionToDelete = quizSession.questions[quizSession.currentQuestionIndex];
    if (!currentQuestionToDelete) {
        toast({ title: "Error", description: "Could not identify question to delete.", variant: "destructive" });
        setShowDeleteQuestionConfirmDialog(false);
        return;
    }

    deleteQuestionById(currentQuestionToDelete.id);

    setQuizSession(prevSession => {
        if (!prevSession) return null;

        const updatedQuestionsArray = prevSession.questions.filter(q => q.id !== currentQuestionToDelete.id);

        if (updatedQuestionsArray.length === 0 || prevSession.currentQuestionIndex >= updatedQuestionsArray.length) {
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
        
        const updatedSession: QuizSession = {
            ...prevSession,
            questions: updatedQuestionsArray,
            answers: prevSession.answers.filter(ans => updatedQuestionsArray.some(q => q.id === ans.questionId)),
            status: 'active',
        };
        saveQuizSession(updatedSession);
        return updatedSession;
    });

    setShowDeleteQuestionConfirmDialog(false);
    toast({
        title: "Question Deleted",
        description: `The question "${currentQuestionToDelete.text.substring(0,30)}..." has been removed.`,
        variant: "default",
    });
  };

  const handleConfirmDeleteCategory = () => {
    if (!quizSession || !quizSession.category || quizSession.category === ALL_QUESTIONS_RANDOM_KEY) return;

    const categoryToDelete = quizSession.category;
    deleteQuestionsByCategory(categoryToDelete);

    clearQuizSession();
    setQuizSession(null);
    setShowDeleteCategoryConfirmDialog(false);
    setIsLoading(true); 
    setTimeout(() => setIsLoading(false), 50);

    toast({
      title: "Quiz Category Deleted",
      description: `All questions in category "${categoryToDelete}" have been removed.`,
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
     return <CategorySelector onCategoryAction={handleCategoryAction} onStartRandomQuiz={handleStartRandomQuiz} />;
  }
  
  if (quizSession.questions.length === 0 || quizSession.currentQuestionIndex >= quizSession.questions.length) {
     if (quizSession.status === 'active') {
        const completedSession = { 
            ...quizSession, 
            status: 'completed' as 'completed',
            endTime: quizSession.endTime || Date.now() 
        };
        const storedSession = getQuizSession();
        if (storedSession?.id === quizSession.id && storedSession?.status !== 'completed') {
            saveQuizSession(completedSession);
            setQuizSession(completedSession);
        }
     }
     return ( 
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Finalizing Quiz...</p>
      </div>
    );
  }

  const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];

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
          {quizSession.category !== "All Categories (Random)" && (
            <Button onClick={handleDeleteCategoryDialog} variant="destructive" className="flex-1 bg-red-700 hover:bg-red-800">
              <Library className="mr-2 h-4 w-4" /> Delete Entire Quiz Category
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteQuestionConfirmDialog} onOpenChange={setShowDeleteQuestionConfirmDialog}>
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

      <AlertDialog open={showDeleteCategoryConfirmDialog} onOpenChange={setShowDeleteCategoryConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entire Quiz Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all questions in the category: <br />
              <strong className="text-primary font-semibold">{quizSession?.category}</strong>
              <br /> and all its sub-categories from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCategory} className="bg-destructive hover:bg-destructive/90">
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
