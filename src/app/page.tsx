
"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
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

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteQuestionConfirmDialog, setShowDeleteQuestionConfirmDialog] = useState(false);
  const [showDeleteCategoryConfirmDialog, setShowDeleteCategoryConfirmDialog] = useState(false);

  const startQuiz = useCallback(async (selectedCategoryPath: string, exactMatch: boolean = false, limit?: number) => {
    setIsLoading(true);
    const allQuestions = await getQuestions();
    let filteredQuestions: Question[] = [];
    let baseCategoryName = selectedCategoryPath;

    if (selectedCategoryPath === ALL_QUESTIONS_RANDOM_KEY) {
      filteredQuestions = allQuestions;
      baseCategoryName = "All Categories (Random)"; // Default name for random
      exactMatch = false; 
    } else if (exactMatch) {
      filteredQuestions = allQuestions.filter(q => typeof q.category === 'string' && q.category === selectedCategoryPath);
      // baseCategoryName remains selectedCategoryPath
    } else {
      filteredQuestions = allQuestions.filter(q => typeof q.category === 'string' && q.category.startsWith(selectedCategoryPath));
      // baseCategoryName remains selectedCategoryPath
    }
    
    if (filteredQuestions.length === 0) {
      toast({
        title: "No Questions Found",
        description: `No questions found for "${baseCategoryName}". Please add questions or select a different category.`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const shuffleArray = (array: any[]) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };

    let questionsForSession = shuffleArray(filteredQuestions);
    let finalQuizCategoryName = baseCategoryName;

    if (selectedCategoryPath === ALL_QUESTIONS_RANDOM_KEY) {
        if (questionsForSession.length > 0) {
            if (limit && limit > 0 && limit < questionsForSession.length) {
                questionsForSession = questionsForSession.slice(0, limit);
                finalQuizCategoryName = `${questionsForSession.length} Random Questions`;
            } else if (limit && limit > 0 && limit >= questionsForSession.length) {
                 finalQuizCategoryName = `${questionsForSession.length} Random Questions (All Available)`;
            } else { // No valid limit, or limit is for more than available
                 finalQuizCategoryName = `All ${questionsForSession.length} Random Questions`;
            }
        } else {
            finalQuizCategoryName = "Random Quiz (No Questions Available)";
        }
    } else if (limit && limit > 0 && limit < questionsForSession.length) { 
        questionsForSession = questionsForSession.slice(0, limit);
    }


    const questionsWithShuffledOptions = questionsForSession.map(question => ({
      ...question,
      options: shuffleArray([...question.options]),
    }));

    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      category: finalQuizCategoryName,
      questions: questionsWithShuffledOptions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      status: 'active',
    };
    const saveResult = await saveQuizSession(newSession);
    if (!saveResult.success) {
        toast({
            title: "Error Starting Quiz",
            description: saveResult.error || "Could not save the new quiz session.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }
    setQuizSession(newSession);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); 

  const loadActiveSessionOrFromParams = useCallback(async () => {
    const categoryFromParams = searchParams.get('category');
    const exactMatchFromParams = searchParams.get('exact') === 'true';
    const limitFromParams = searchParams.get('limit');

    if (categoryFromParams) {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.delete('category');
      current.delete('exact');
      current.delete('limit');
      const query = current.toString() ? `?${current}` : '';
      router.replace(`${window.location.pathname}${query}`, {scroll: false}); 

      const numLimit = limitFromParams ? parseInt(limitFromParams, 10) : undefined;
      await startQuiz(categoryFromParams, exactMatchFromParams, numLimit);
      return;
    }

    const activeSession = await getQuizSession();
    if (activeSession && activeSession.status === 'active') {
      setQuizSession(activeSession);
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, startQuiz]); 

  useEffect(() => {
    loadActiveSessionOrFromParams();
  }, [loadActiveSessionOrFromParams]);

  useEffect(() => {
    if (quizSession?.status === 'completed') {
      router.push('/summary');
    }
  }, [quizSession, router]);


  const handleCategoryAction = async (categoryPath: string, isLeafNode: boolean) => {
    if (isLeafNode) {
      router.push(`/quiz/manage/${categoryPath.split('/').map(segment => encodeURIComponent(segment)).join('/')}`);
    } else {
      await startQuiz(categoryPath, false);
    }
  };

  const handleStartRandomQuiz = async (limit?: number) => {
    await startQuiz(ALL_QUESTIONS_RANDOM_KEY, false, limit);
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
      
      saveQuizSession(updatedSession).then(res => { 
          if (!res.success) {
            toast({ title: "Save Error", description: res.error || "Failed to save answer progress.", variant: "destructive" });
          }
      });
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

      saveQuizSession(updatedSession).then(res => {
          if (!res.success) {
            toast({ title: "Save Error", description: res.error || "Failed to save timeout progress.", variant: "destructive" });
          }
      });
      return updatedSession;
    });
  };

  const handleNextQuestion = () => {
    setQuizSession(prevSession => {
      if (!prevSession) return prevSession;
      const nextIndex = prevSession.currentQuestionIndex + 1;

      if (nextIndex < prevSession.questions.length) {
        const updatedSession = { ...prevSession, currentQuestionIndex: nextIndex };
        saveQuizSession(updatedSession).then(res => {
            if (!res.success) {
                toast({ title: "Save Error", description: res.error || "Failed to save progress to next question.", variant: "destructive" });
            }
        });
        return updatedSession;
      } else {
        const completedSession = { 
          ...prevSession, 
          status: 'completed' as 'completed',
          endTime: Date.now() 
        };
        saveQuizSession(completedSession).then(res => {
             if (!res.success) {
                toast({ title: "Save Error", description: res.error || "Failed to save completed quiz session.", variant: "destructive" });
            }
        });
        return completedSession;
      }
    });
  };
  
  const handleRestartQuiz = async () => {
    clearQuizSession();
    setQuizSession(null);
    setIsLoading(true); 
    setTimeout(() => {
        loadActiveSessionOrFromParams();
    }, 50);
  };

  const handleDeleteCurrentQuestionDialog = () => {
    setShowDeleteQuestionConfirmDialog(true);
  };

  const handleDeleteCategoryDialog = () => {
     if (quizSession?.category && quizSession.category.toLowerCase().includes("random")) {
        toast({
            title: "Action Not Allowed",
            description: "Cannot delete a dynamically generated 'Random Questions' quiz category.",
            variant: "destructive"
        });
        return;
    }
    setShowDeleteCategoryConfirmDialog(true);
  };

  const handleConfirmDeleteCurrentQuestion = async () => {
    if (!quizSession || !quizSession.questions || quizSession.questions.length === 0) return;
    
    const currentQuestionToDelete = quizSession.questions[quizSession.currentQuestionIndex];
    if (!currentQuestionToDelete) {
        toast({ title: "Error", description: "Could not identify question to delete.", variant: "destructive" });
        setShowDeleteQuestionConfirmDialog(false);
        return;
    }

    const deleteResult = await deleteQuestionById(currentQuestionToDelete.id);
    setShowDeleteQuestionConfirmDialog(false);

    if (!deleteResult.success) {
        toast({
            title: "Deletion Failed",
            description: deleteResult.error || "Could not delete the question.",
            variant: "destructive",
        });
        return;
    }

    toast({
        title: "Question Deleted",
        description: `The question "${currentQuestionToDelete.text.substring(0,30)}..." has been removed.`,
        variant: "default",
    });

    setQuizSession(prevSession => {
        if (!prevSession) return null;

        const updatedQuestionsArray = prevSession.questions.filter(q => q.id !== currentQuestionToDelete.id);
        let newSessionState: QuizSession;

        if (updatedQuestionsArray.length === 0 || prevSession.currentQuestionIndex >= updatedQuestionsArray.length) {
            newSessionState = {
                ...prevSession,
                questions: updatedQuestionsArray,
                answers: prevSession.answers.filter(ans => updatedQuestionsArray.some(q => q.id === ans.questionId)),
                currentQuestionIndex: 0,
                status: 'completed',
                endTime: Date.now(),
            };
        } else {
          newSessionState = {
            ...prevSession,
            questions: updatedQuestionsArray,
            answers: prevSession.answers.filter(ans => updatedQuestionsArray.some(q => q.id === ans.questionId)),
            status: 'active', 
          };
        }
        saveQuizSession(newSessionState).then(res => { 
            if(!res.success){
                toast({ title: "Session Update Failed", description: res.error || "Could not update session after question deletion.", variant: "destructive" });
            }
        });
        return newSessionState;
    });
  };

  const handleConfirmDeleteCategory = async () => {
    if (!quizSession || !quizSession.category || quizSession.category.toLowerCase().includes("random")) {
      toast({ title: "Invalid Category", description: "Cannot delete a random quiz category.", variant: "destructive" });
      setShowDeleteCategoryConfirmDialog(false);
      return;
    }


    const categoryToDelete = quizSession.category;
    const deleteResult = await deleteQuestionsByCategory(categoryToDelete);
    setShowDeleteCategoryConfirmDialog(false);

    if (!deleteResult.success) {
        toast({
            title: "Category Deletion Failed",
            description: deleteResult.error || "Could not delete the quiz category.",
            variant: "destructive",
        });
        return;
    }

    toast({
      title: "Quiz Category Deleted",
      description: `All questions in category "${categoryToDelete}" have been removed.`,
      variant: "default",
    });

    clearQuizSession();
    setQuizSession(null);
    setIsLoading(true); 
    setTimeout(() => {
       loadActiveSessionOrFromParams();
    }, 50);
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
        saveQuizSession(completedSession).then(res => {
            if(!res.success){
                 toast({ title: "Session Finalization Failed", description: res.error || "Could not save finalized session state.", variant: "destructive" });
            }
        });
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
          key={`${quizSession.id}-${currentQuestion.id}`}
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
           {quizSession.category && !quizSession.category.toLowerCase().includes("random") && (
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

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Quiz Page...</p>
      </div>
    }>
      <QuizPageContent />
    </Suspense>
  );
}
