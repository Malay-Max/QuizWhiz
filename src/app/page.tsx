

"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Question, QuizSession, Category as CategoryType, ConfidenceLevel } from '@/types';
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
import {
  getActiveReviewSession,
  getReviewSessionById,
  updateReviewSession,
  clearActiveReviewSession
} from '@/lib/srs-storage';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser: user, isLoading: isAuthLoading } = useAuth();
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteQuestionConfirmDialog, setShowDeleteQuestionConfirmDialog] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [showDeleteCategoryConfirmDialog, setShowDeleteCategoryConfirmDialog] = useState(false);
  const [allCategories, setAllCategories] = useState<CategoryType[]>([]);

  // Helper to check if we're in a review-based mode (review or weak-spots)
  const isReviewBasedMode = () => {
    const mode = searchParams.get('mode');
    return mode === 'review' || mode === 'weak-spots';
  };

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
      totalPausedTime: 0,
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
    const mode = searchParams.get('mode');

    // Handle all review-based modes (review sessions from SRS)
    if (mode === 'review' || mode === 'weak-spots') {
      if (!user) {
        toast({ title: "Authentication Required", description: "Please log in to access this session.", variant: "destructive" });
        router.push('/login');
        return;
      }

      const sessionId = searchParams.get('sessionId');
      let reviewSession = null;

      try {
        if (sessionId) {
          reviewSession = await getReviewSessionById(sessionId);
        } else {
          reviewSession = await getActiveReviewSession();
        }
      } catch (error) {
        console.error("Failed to load review session:", error);
        toast({ title: "Error", description: "Failed to load session.", variant: "destructive" });
      }

      if (reviewSession && reviewSession.status === 'active') {
        const adaptedSession: QuizSession = {
          ...reviewSession,
          categoryId: mode === 'weak-spots' ? 'weak-spots' : 'review',
          categoryName: mode === 'weak-spots' ? 'Weak Spots Practice' : 'Review Session',
          totalPausedTime: 0,
        };
        setQuizSession(adaptedSession);
      } else {
        toast({ title: "Session Not Found", description: "Could not find an active session.", variant: "destructive" });
      }
      setIsLoading(false);
      return;
    }

    const categoryIdFromParams = searchParams.get('categoryId');
    const limitFromParams = searchParams.get('limit');

    if (categoryIdFromParams) {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.delete('categoryId');
      current.delete('limit');
      const query = current.toString() ? `?${current}` : '';
      router.replace(`${window.location.pathname}${query}`, { scroll: false });

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
    if (!isAuthLoading && allCategories.length > 0) {
      loadActiveSessionOrFromParams();
    }
  }, [isAuthLoading, allCategories, loadActiveSessionOrFromParams]);

  useEffect(() => {
    if (quizSession?.status === 'completed') {
      router.push('/summary');
    }
  }, [quizSession, router]);

  const handleCategoryAction = (categoryId: string) => {
    router.push(`/quiz/manage/${categoryId}`);
  };

  const handleStartRandomQuiz = async (limit?: number) => {
    await startQuiz(ALL_QUESTIONS_RANDOM_KEY, limit);
  };

  const handleAnswer = (selectedAnswerId: string, timeTaken: number, confidence?: ConfidenceLevel) => {
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
        confidence,
      };

      const updatedAnswers = [...prevSession.answers, newAnswer];
      const updatedSession = { ...prevSession, answers: updatedAnswers };

      if (isReviewBasedMode()) {
        if (updatedSession.userId) {
          updateReviewSession(updatedSession as any).then(res => {
            if (!res.success) toast({ title: "Save Error", description: res.error || "Failed to save review progress.", variant: "destructive" });
          });
        }
      } else {
        saveQuizSession(updatedSession).then(res => {
          if (!res.success) {
            toast({ title: "Save Error", description: res.error || "Failed to save answer progress.", variant: "destructive" });
          }
        });
      }
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
        selectedAnswerId: '',
        isCorrect: false,
        timeTaken,
        skipped: true,
        confidence: 1, // ConfidenceLevel.GUESS
      };

      const updatedAnswers = [...prevSession.answers, newAnswer];
      const updatedSession = { ...prevSession, answers: updatedAnswers };

      if (isReviewBasedMode()) {
        if (updatedSession.userId) {
          updateReviewSession(updatedSession as any).then(res => {
            if (!res.success) toast({ title: "Save Error", description: res.error || "Failed to save timeout progress.", variant: "destructive" });
          });
        }
      } else {
        saveQuizSession(updatedSession).then(res => {
          if (!res.success) {
            toast({ title: "Save Error", description: res.error || "Failed to save timeout progress.", variant: "destructive" });
          }
        });
      }
      return updatedSession;
    });
  };

  const handleNextQuestion = () => {
    setQuizSession(prevSession => {
      if (!prevSession) return prevSession;
      const nextIndex = prevSession.currentQuestionIndex + 1;
      const updatedSession = { ...prevSession, currentQuestionIndex: nextIndex };

      if (nextIndex >= prevSession.questions.length) {
        const completedSession = { ...updatedSession, status: 'completed', endTime: Date.now() } as QuizSession;

        if (isReviewBasedMode()) {
          if (completedSession.userId) {
            updateReviewSession(completedSession as any).then(res => {
              if (!res.success) toast({ title: "Save Error", description: res.error || "Failed to save completed session.", variant: "destructive" });
            });
          }
        } else {
          saveQuizSession(completedSession);
        }
        return completedSession;
      }

      if (isReviewBasedMode()) {
        if (updatedSession.userId) {
          updateReviewSession(updatedSession as any);
        }
      } else {
        saveQuizSession(updatedSession);
      }
      return updatedSession;
    });
  };

  const handleRestartQuiz = async () => {
    if (isReviewBasedMode()) {
      await clearActiveReviewSession();
      router.push('/review');
    } else {
      await clearQuizSession();
      setQuizSession(null);
      setIsLoading(true);
      await loadActiveSessionOrFromParams();
    }
  };

  const handleDeleteCurrentQuestion = () => {
    const currentQuestion = quizSession?.questions[quizSession?.currentQuestionIndex];
    if (!currentQuestion) {
      toast({ title: "Error", description: "No question to delete.", variant: "destructive" });
      return;
    }
    setQuestionToDelete(currentQuestion.id);
    setShowDeleteQuestionConfirmDialog(true);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    setShowDeleteQuestionConfirmDialog(false);

    toast({ title: "Deleting...", description: "Removing question from database." });
    const result = await deleteQuestionById(questionToDelete);
    if (result.success) {
      toast({ title: "Deleted", description: "Question deleted successfully." });
      setQuizSession(prevSession => {
        if (!prevSession) return prevSession;
        const updatedQuestions = prevSession.questions.filter(q => q.id !== questionToDelete);
        const updatedAnswers = prevSession.answers.filter(ans => prevSession.questions.find(q => q.id === ans.questionId) && q.id !== questionToDelete);

        if (updatedQuestions.length === 0) {
          toast({ title: "Quiz Complete", description: "No more questions available." });
          return { ...prevSession, questions: [], status: 'completed', endTime: Date.now() } as QuizSession;
        }

        return { ...prevSession, questions: updatedQuestions, answers: updatedAnswers };
      });
    } else {
      toast({ title: "Error", description: result.error || "Failed to delete question.", variant: "destructive" });
    }
    setQuestionToDelete(null);
  };

  const handleDeleteCategoryQuestions = () => {
    if (!quizSession || quizSession.categoryId === ALL_QUESTIONS_RANDOM_KEY) {
      toast({ title: "Cannot Delete", description: "This operation is not available for random quizzes.", variant: "destructive" });
      return;
    }
    setShowDeleteCategoryConfirmDialog(true);
  };

  const confirmDeleteCategoryQuestions = async () => {
    const categoryIdToDelete = quizSession?.categoryId;
    if (!categoryIdToDelete || categoryIdToDelete === ALL_QUESTIONS_RANDOM_KEY) return;
    const categoryName = getFullCategoryPath(categoryIdToDelete, allCategories);
    setShowDeleteCategoryConfirmDialog(false);

    toast({ title: "Deleting...", description: `Removing all questions from "${categoryName}".` });
    const result = await deleteQuestionsByCategoryId(categoryIdToDelete);
    if (result.success) {
      toast({ title: "Deleted", description: `All questions from "${categoryName}" deleted successfully.` });
      await clearQuizSession();
      router.push('/quiz');
    } else {
      toast({ title: "Error", description: result.error || "Failed to delete category questions.", variant: "destructive" });
    }
  };

  const handleManageCategories = () => {
    const catId = quizSession?.categoryId || null;
    router.push(catId ? `/quiz/manage/${catId}` : `/quiz/manage`);
  };

  if (isLoading || allCategories.length === 0 || !quizSession) {
    return (
      <>
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg text-muted-foreground text-center">Loading your quiz...</p>
          </>
        ) : (
          <CategorySelector
            categories={allCategories}
            onSelectCategory={startQuiz}
            onManageCategory={handleCategoryAction}
            onStartRandomQuiz={handleStartRandomQuiz}
          />
        )}
      </>
    );
  }

  if (quizSession.status === 'completed') {
    return null;
  }

  const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <p className="text-lg text-muted-foreground">No question available.</p>
        <Button onClick={handleRestartQuiz}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restart Quiz
        </Button>
      </div>
    );
  }

  return (
    <>
      <QuestionCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        onTimeout={handleTimeout}
        onNext={handleNextQuestion}
        questionNumber={quizSession.currentQuestionIndex + 1}
        totalQuestions={quizSession.questions.length}
      />

      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-3xl mx-auto mt-6">
        <Button variant="outline" onClick={handleRestartQuiz} title="Restart Quiz">
          <RotateCcw className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Restart</span>
        </Button>

        <Button
          variant="outline"
          onClick={handleDeleteCurrentQuestion}
          title="Delete Current Question"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Delete Question</span>
        </Button>

        <Button
          variant="outline"
          onClick={handleDeleteCategoryQuestions}
          disabled={quizSession.categoryId === ALL_QUESTIONS_RANDOM_KEY}
          title="Delete All Questions in This Category"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Delete Category Questions</span>
        </Button>

        <Button variant="outline" onClick={handleManageCategories} title="Manage Categories">
          <Library className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Manage Categories</span>
        </Button>
      </div>

      <AlertDialog open={showDeleteQuestionConfirmDialog} onOpenChange={setShowDeleteQuestionConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuestion}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteCategoryConfirmDialog} onOpenChange={setShowDeleteCategoryConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete All Questions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all questions in "{quizSession.categoryName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategoryQuestions}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading quiz...</p>
      </div>
    }>
      <QuizPageContent />
    </Suspense>
  );
}
