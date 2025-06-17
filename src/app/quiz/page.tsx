
"use client";

// This file should be identical to src/app/page.tsx for now.
// Duplicating content to ensure correct routing and potential future divergence.

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Question, QuizSession, Category as CategoryType } from '@/types';
import { 
  getQuestionsByCategoryIdAndDescendants, 
  saveQuizSession, 
  getQuizSession, 
  clearQuizSession, 
  deleteQuestionById, 
  deleteQuestionsByCategoryId, 
  getAllCategories,
  getFullCategoryPath
} from '@/lib/storage';
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


function QuizPlayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteQuestionConfirmDialog, setShowDeleteQuestionConfirmDialog] = useState(false);
  const [showDeleteCategoryConfirmDialog, setShowDeleteCategoryConfirmDialog] = useState(false);
  const [allCategories, setAllCategories] = useState<CategoryType[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const cats = await getAllCategories();
      setAllCategories(cats);
    };
    fetchCategories();
  }, []);


  const startQuiz = useCallback(async (selectedIdOrKey: string, limit?: number) => {
    setIsLoading(true);
    let questionsForSession: Question[] = [];
    let finalQuizCategoryName = "Quiz";
    let finalQuizCategoryId = selectedIdOrKey;

    if (selectedIdOrKey === ALL_QUESTIONS_RANDOM_KEY) {
      const allQuestionsFromAllCats: Question[] = [];
      const topLevelCats = allCategories.filter(c => !c.parentId);
      for (const cat of topLevelCats) {
          const qs = await getQuestionsByCategoryIdAndDescendants(cat.id, allCategories);
          allQuestionsFromAllCats.push(...qs);
      }
      questionsForSession = allQuestionsFromAllCats;
      finalQuizCategoryId = ALL_QUESTIONS_RANDOM_KEY;
      
      if (questionsForSession.length > 0) {
        if (limit && limit > 0 && limit < questionsForSession.length) {
            questionsForSession = questionsForSession.slice(0, limit);
            finalQuizCategoryName = `${questionsForSession.length} Random Questions`;
        } else {
            finalQuizCategoryName = `All ${questionsForSession.length} Random Questions`;
        }
      } else {
          finalQuizCategoryName = "Random Quiz (No Questions Available)";
      }

    } else {
      questionsForSession = await getQuestionsByCategoryIdAndDescendants(selectedIdOrKey, allCategories);
      const selectedCategory = allCategories.find(c => c.id === selectedIdOrKey);
      finalQuizCategoryName = selectedCategory ? getFullCategoryPath(selectedCategory.id, allCategories) : "Selected Category";
      finalQuizCategoryId = selectedIdOrKey;
    }
    
    if (questionsForSession.length === 0) {
      toast({
        title: "No Questions Found",
        description: `No questions found for "${finalQuizCategoryName}". Please add questions or select a different category/option.`,
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
    
    questionsForSession = shuffleArray(questionsForSession);
    if (selectedIdOrKey !== ALL_QUESTIONS_RANDOM_KEY && limit && limit > 0 && limit < questionsForSession.length) { 
        questionsForSession = questionsForSession.slice(0, limit);
    }
    
    const questionsWithShuffledOptions = questionsForSession.map(question => ({
      ...question,
      options: shuffleArray([...question.options]),
    }));

    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      categoryId: finalQuizCategoryId,
      categoryName: finalQuizCategoryName,
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
  }, [allCategories, toast]);

  const loadActiveSessionOrFromParams = useCallback(async () => {
    const categoryIdFromParams = searchParams.get('categoryId');
    const limitFromParams = searchParams.get('limit');

    if (categoryIdFromParams) {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.delete('categoryId');
      current.delete('limit');
      const query = current.toString() ? `?${current}` : '';
      router.replace(`${window.location.pathname}${query}`, {scroll: false});

      const numLimit = limitFromParams ? parseInt(limitFromParams, 10) : undefined;
      await startQuiz(categoryIdFromParams, numLimit);
      return;
    }

    const activeSession = await getQuizSession();
    if (activeSession && activeSession.status === 'active') {
      setQuizSession(activeSession);
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, startQuiz, allCategories]);

  useEffect(() => {
    if (allCategories.length > 0) {
        loadActiveSessionOrFromParams();
    }
  }, [allCategories, loadActiveSessionOrFromParams]);

  useEffect(() => {
    if (quizSession?.status === 'completed') {
      router.push('/summary');
    }
  }, [quizSession, router]);


  const handleCategoryAction = async (categoryId: string, isLeafNode: boolean) => {
    if (isLeafNode) {
      router.push(`/quiz/manage/${categoryId}`);
    } else {
      await startQuiz(categoryId);
    }
  };

  const handleStartRandomQuiz = async (limit?: number) => {
    await startQuiz(ALL_QUESTIONS_RANDOM_KEY, limit);
  };

  const handleAnswer = (selectedAnswerId: string, timeTaken: number) => {
     setQuizSession(prevSession => {
      if (!prevSession) return prevSession;
      const currentQuestion = prevSession.questions[prevSession.currentQuestionIndex];
      if (!currentQuestion || prevSession.answers.find(ans => ans.questionId === currentQuestion.id)) {
        return prevSession;
      }
      
      const isCorrect = currentQuestion.correctAnswerId === selectedAnswerId;
      const newAnswer: QuizSession['answers'][0] = {
        questionId: currentQuestion.id,
        selectedAnswerId,
        isCorrect,
        timeTaken,
        skipped: false,
      };
      
      const updatedAnswers = [...prevSession.answers, newAnswer];
      const updatedSession = { ...prevSession, answers: updatedAnswers };
      
      saveQuizSession(updatedSession).then(res => {
          if(!res.success){
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
      
      const newAnswer: QuizSession['answers'][0] = {
        questionId: currentQuestion.id,
        timeTaken,
        skipped: true,
      };
      
      const updatedAnswers = [...prevSession.answers, newAnswer];
      const updatedSession = { ...prevSession, answers: updatedAnswers };

      saveQuizSession(updatedSession).then(res => {
           if(!res.success){
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
            if(!res.success){
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
            if(!res.success){
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
      if (allCategories.length > 0) loadActiveSessionOrFromParams();
    }, 50);
  };

  const handleDeleteCurrentQuestionDialog = () => {
    setShowDeleteQuestionConfirmDialog(true);
  };

  const handleDeleteCategoryDialog = () => {
     if (quizSession?.categoryId && quizSession.categoryId === ALL_QUESTIONS_RANDOM_KEY) {
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
    if (!quizSession || !quizSession.categoryId || quizSession.categoryId === ALL_QUESTIONS_RANDOM_KEY) {
        toast({ title: "Invalid Category", description: "Cannot delete a random quiz category.", variant: "destructive" });
        setShowDeleteCategoryConfirmDialog(false);
        return;
    }

    const categoryIdToDelete = quizSession.categoryId;
    const deleteResult = await deleteQuestionsByCategoryId(categoryIdToDelete, allCategories);
    setShowDeleteCategoryConfirmDialog(false);

    if (!deleteResult.success) {
        toast({
            title: "Category Questions Deletion Failed",
            description: deleteResult.error || "Could not delete questions in the category.",
            variant: "destructive",
        });
        return;
    }

    toast({
      title: "Quiz Category Questions Deleted",
      description: `All questions in category "${quizSession.categoryName || 'Selected'}" have been removed.`,
      variant: "default",
    });

    clearQuizSession();
    setQuizSession(null);
    setIsLoading(true); 
    setTimeout(() => {
      if (allCategories.length > 0) loadActiveSessionOrFromParams();
    }, 50);
  };

  if (isLoading || allCategories.length === 0 && !quizSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Quiz Data...</p>
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
          {quizSession.categoryId && quizSession.categoryId !== ALL_QUESTIONS_RANDOM_KEY && (
            <Button onClick={handleDeleteCategoryDialog} variant="destructive" className="flex-1 bg-red-700 hover:bg-red-800">
              <Library className="mr-2 h-4 w-4" /> Delete Questions in This Category
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
            <AlertDialogTitle>Delete All Questions in Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all questions in the category: <br />
              <strong className="text-primary font-semibold">{quizSession?.categoryName || 'Selected Category'}</strong>
              <br /> and its sub-categories from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCategory} className="bg-destructive hover:bg-destructive/90">
              Delete Category Questions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


export default function QuizPlayPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Quiz Page...</p>
      </div>
    }>
      <QuizPlayPageContent />
    </Suspense>
  );
}
