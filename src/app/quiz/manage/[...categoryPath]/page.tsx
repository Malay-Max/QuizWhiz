
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Question, QuizSession } from '@/types';
import { getQuestions, deleteQuestionById, saveQuizSession, clearQuizSession } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { ArrowLeft, Edit, Trash2, Play, ListChecks, FolderOpen, Loader2 } from 'lucide-react';


export default function ManageCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [categoryPath, setCategoryPath] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categoryName = categoryPath.split('/').pop() || 'Category';

  const loadQuestionsForCategory = useCallback(async () => {
    if (!categoryPath) return;
    setIsLoading(true);
    const allQuestions = await getQuestions();
    const filteredQuestions = allQuestions.filter(q => typeof q.category === 'string' && q.category === categoryPath);
    setQuestions(filteredQuestions);
    setIsLoading(false);
  }, [categoryPath]);

  useEffect(() => {
    if (params.categoryPath) {
      const decodedPath = Array.isArray(params.categoryPath)
        ? params.categoryPath.map(segment => decodeURIComponent(segment)).join('/')
        : decodeURIComponent(params.categoryPath);
      setCategoryPath(decodedPath);
    }
  }, [params.categoryPath]);

  useEffect(() => {
    loadQuestionsForCategory();
  }, [loadQuestionsForCategory]);

  const handleDeleteClick = (question: Question) => {
    setQuestionToDelete(question);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!questionToDelete) return;
    const deleteResult = await deleteQuestionById(questionToDelete.id);
    setShowDeleteConfirm(false);
    setQuestionToDelete(null);

    if (deleteResult.success) {
        toast({
          title: 'Question Deleted',
          description: `"${questionToDelete.text.substring(0, 30)}..." has been removed.`,
        });
        await loadQuestionsForCategory(); 
    } else {
        toast({
          title: 'Deletion Failed',
          description: deleteResult.error || 'Could not delete the question.',
          variant: 'destructive',
        });
    }
  };

  const handleStartQuizForThisCategory = async () => {
    if (questions.length === 0) {
      toast({
        title: "No Questions",
        description: `There are no questions in "${categoryName}" to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    clearQuizSession(); 

    const shuffleArray = (array: any[]) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };
    
    const shuffledQuestions = shuffleArray(questions);

    const questionsWithShuffledOptions = shuffledQuestions.map(question => ({
      ...question,
      options: shuffleArray([...question.options]),
    }));

    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      category: categoryPath,
      questions: questionsWithShuffledOptions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      status: 'active',
    };
    const saveResult = await saveQuizSession(newSession);
    if (saveResult.success) {
        router.push('/'); 
    } else {
        toast({
            title: "Error Starting Quiz",
            description: saveResult.error || "Could not save the new quiz session.",
            variant: "destructive",
        });
    }
  };
  
  const handleEditClick = (question: Question) => {
    router.push(`/add-question?editId=${question.id}`);
  };


  return (
    <div className="container mx-auto py-4 sm:py-8">
      <Button variant="outline" onClick={() => router.push('/')} className="mb-4 sm:mb-6 text-sm sm:text-base">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quiz Selection
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex-grow min-w-0">
                <CardTitle className="font-headline text-xl sm:text-2xl md:text-3xl flex items-center break-words">
                    <FolderOpen className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" /> 
                    <span className="truncate">Manage Category: {categoryName}</span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm break-all">
                    Path: {categoryPath}
                </CardDescription>
            </div>
            <Button 
                onClick={handleStartQuizForThisCategory} 
                disabled={questions.length === 0 || isLoading}
                size="lg"
                className="w-full sm:w-auto text-sm sm:text-base mt-2 sm:mt-0"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> }
                 Start Quiz
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mr-2 sm:mr-3" />
                <p className="text-base sm:text-lg text-muted-foreground">Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-10">
              <ListChecks className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-lg sm:text-xl font-semibold text-muted-foreground">No questions found here.</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Add questions to "{categoryName}" to see them.</p>
              <Button onClick={() => router.push('/add-question')} className="mt-4 sm:mt-6 text-sm sm:text-base">
                Add Questions
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-22rem)] sm:h-[calc(100vh-25rem)] pr-2 sm:pr-4">
              <div className="space-y-3 sm:space-y-4">
                {questions.map((q, index) => (
                  <Card key={q.id} className="p-3 sm:p-4 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex-grow min-w-0">
                        <p className="font-semibold text-sm sm:text-base md:text-lg text-primary break-words">Q{index + 1}: {q.text}</p>
                        <ul className="list-disc list-inside pl-2 sm:pl-4 mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                          {q.options.map(opt => (
                            <li key={opt.id} className={`break-words ${opt.id === q.correctAnswerId ? 'font-bold text-accent' : ''}`}>
                              {opt.text} {opt.id === q.correctAnswerId && "(Correct)"}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex gap-2 ml-0 sm:ml-4 shrink-0 self-start sm:self-auto w-full sm:w-auto justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(q)} title="Edit Question" className="flex-1 sm:flex-initial">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(q)} title="Delete Question" className="flex-1 sm:flex-initial">
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs sm:text-sm text-muted-foreground">
                Found {questions.length} question(s) directly in category: "{categoryName}".
            </p>
        </CardFooter>
      </Card>

      {questionToDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg sm:text-xl">Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-sm sm:text-base">
                Are you sure you want to permanently delete this question? <br />
                <strong className="text-primary mt-2 block">
                    {questionToDelete.text.substring(0,100)}{questionToDelete.text.length > 100 ? "..." : ""}
                </strong>
                <br />This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)} className="text-sm sm:text-base">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-sm sm:text-base">
                Delete Question
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
