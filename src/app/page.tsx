
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuizSession, QuizAnswer } from '@/types';
import { getQuestions, saveQuizSession, getQuizSession, clearQuizSession, deleteQuestionById, deleteQuestionsByCategory } from '@/lib/storage';
import { CategorySelector, ALL_QUESTIONS_RANDOM_KEY } from '@/components/quiz/CategorySelector';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Trash2, Library } from 'lucide-react'; // Added Library for delete category
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
  const [showDeleteQuestionConfirmDialog, setShowDeleteQuestionConfirmDialog] = useState(false);
  const [showDeleteCategoryConfirmDialog, setShowDeleteCategoryConfirmDialog] = useState(false);

  const loadActiveSession = useCallback(() => {
    const activeSession = getQuizSession();
    if (activeSession && activeSession.status === 'active') {
      setQuizSession(activeSession);
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
  }, [quizSession, router]);

  const startQuiz = (selectedCategoryPath: string) => {
    setIsLoading(true);
    const allQuestions = getQuestions();
    let filteredQuestions: Question[] = [];
    let quizCategoryName = selectedCategoryPath;

    if (selectedCategoryPath === ALL_QUESTIONS_RANDOM_KEY) {
      filteredQuestions = allQuestions;
      quizCategoryName = "All Categories (Random)";
    } else {
      filteredQuestions = allQuestions.filter(q => typeof q.category === 'string' && q.category.startsWith(selectedCategoryPath));
    }
    
    if (filteredQuestions.length === 0) {
      toast({
        title: "No Questions Found",
        description: `No questions found for "${selectedCategoryPath === ALL_QUESTIONS_RANDOM_KEY ? "any category" : selectedCategoryPath}". Please add questions or select a different category.`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const shuffledQuestions = [...filteredQuestions].sort(() => Math.random() - 0.5);

    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      category: quizCategoryName,
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
      if (prevSession.answers.find(ans => ans.questionId === (prevSession.questions[prevSession.currentQuestionIndex] || {}).id)) {
        return prevSession;
      }
      const currentQuestions = prevSession.questions || [];
      if (prevSession.currentQuestionIndex >= currentQuestions.length) {
        return prevSession;
      }
      const currentQuestion = currentQuestions[prevSession.currentQuestionIndex];
      if (!currentQuestion) {
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
      if (prevSession.answers.find(ans => ans.questionId === (prevSession.questions[prevSession.currentQuestionIndex] || {}).id)) {
        return prevSession; 
      }
      const currentQuestions = prevSession.questions || [];
      if (prevSession.currentQuestionIndex >= currentQuestions.length) {
        return prevSession;
      }
      const currentQuestion = currentQuestions[prevSession.currentQuestionIndex];
      if (!currentQuestion) {
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
    if (!quizSession || questionsForCategory.length === 0) return;
    
    const currentQuestionToDelete = questionsForCategory[quizSession.currentQuestionIndex];
    if (!currentQuestionToDelete) {
        toast({ title: "Error", description: "Could not identify question to delete.", variant: "destructive" });
        setShowDeleteQuestionConfirmDialog(false);
        return;
    }

    deleteQuestionById(currentQuestionToDelete.id);

    setQuizSession(prevSession => {
        if (!prevSession) return null;

        const updatedQuestionsArray = prevSession.questions.filter(q => q.id !== currentQuestionToDelete.id);
        
        // Ensure questionsForCategory is kept in sync
        setQuestionsForCategory(updatedQuestionsArray);

        if (updatedQuestionsArray.length === 0 || prevSession.currentQuestionIndex >= updatedQuestionsArray.length) {
            const completedSession: QuizSession = {
                ...prevSession,
                questions: updatedQuestionsArray,
                answers: prevSession.answers.filter(ans => updatedQuestionsArray.some(q => q.id === ans.questionId)),
                currentQuestionIndex: 0, // Reset index
                status: 'completed',
                endTime: Date.now(),
            };
            saveQuizSession(completedSession);
            return completedSession;
        }

        // Current index might still be valid or effectively points to the "new" current after deletion
        // If currentQuestionIndex was the last valid index, it's now out of bounds, handled above.
        // Otherwise, the same index will show the next item from the filtered array.
        const updatedSession: QuizSession = {
            ...prevSession,
            questions: updatedQuestionsArray,
            answers: prevSession.answers.filter(ans => updatedQuestionsArray.some(q => q.id === ans.questionId)),
            // currentQuestionIndex: prevSession.currentQuestionIndex, // No change needed here, or it could be Math.min(prevSession.currentQuestionIndex, updatedQuestionsArray.length -1) if that makes more sense. For now, no change as the condition above handles empty/out of bounds.
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
    deleteQuestionsByCategory(categoryToDelete); // This deletes from global storage

    clearQuizSession(); // Clear the current session as it's based on the deleted category
    setQuizSession(null);
    setQuestionsForCategory([]);
    setShowDeleteCategoryConfirmDialog(false);
    setIsLoading(true); // To re-trigger category selector
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
    return <CategorySelector onSelectCategory={startQuiz} />;
  }
  
  if (quizSession.questions.length === 0 || quizSession.currentQuestionIndex >= quizSession.questions.length) {
     if (quizSession.status === 'active') { 
        const completedSession = { 
            ...quizSession, 
            status: 'completed' as 'completed',
            endTime: quizSession.endTime || Date.now() 
        };
        if (quizSession.id && getQuizSession()?.id === quizSession.id && getQuizSession()?.status !== 'completed') {
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
