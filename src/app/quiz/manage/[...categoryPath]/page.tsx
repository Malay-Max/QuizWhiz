
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
import { ArrowLeft, Edit, Trash2, Play, ListChecks, FolderOpen } from 'lucide-react';


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

  const loadQuestions = useCallback(() => {
    if (!categoryPath) return;
    setIsLoading(true);
    const allQuestions = getQuestions();
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
    loadQuestions();
  }, [loadQuestions]);

  const handleDeleteClick = (question: Question) => {
    setQuestionToDelete(question);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!questionToDelete) return;
    deleteQuestionById(questionToDelete.id);
    toast({
      title: 'Question Deleted',
      description: `"${questionToDelete.text.substring(0, 30)}..." has been removed.`,
    });
    setQuestionToDelete(null);
    setShowDeleteConfirm(false);
    loadQuestions(); // Refresh the list
  };

  const handleStartQuizForThisCategory = () => {
    if (questions.length === 0) {
      toast({
        title: "No Questions",
        description: `There are no questions in "${categoryName}" to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    clearQuizSession(); // Clear any existing session

    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
    const newSession: QuizSession = {
      id: crypto.randomUUID(),
      category: categoryPath, // Use the exact path
      questions: shuffledQuestions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      status: 'active',
    };
    saveQuizSession(newSession);
    router.push('/'); // Navigate to the main quiz playing page
  };
  
  // Placeholder for edit functionality
  const handleEditClick = (question: Question) => {
    toast({
        title: "Edit Feature",
        description: "Editing questions from here will be implemented soon!",
        variant: "default"
    });
    // Future: router.push(`/add-question?editId=${question.id}`); or open modal
  };


  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => router.push('/')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quiz Selection
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline text-3xl flex items-center">
                    <FolderOpen className="mr-3 h-8 w-8 text-primary" /> Manage Category: {categoryName}
                </CardTitle>
                <CardDescription className="mt-1">
                    Path: {categoryPath}
                </CardDescription>
            </div>
            <Button 
                onClick={handleStartQuizForThisCategory} 
                disabled={questions.length === 0}
                size="lg"
                className="w-full sm:w-auto"
            >
                <Play className="mr-2 h-5 w-5" /> Start Quiz with this Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading questions...</p>
          ) : questions.length === 0 ? (
            <div className="text-center py-10">
              <ListChecks className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No questions found in this specific category.</p>
              <p className="text-sm text-muted-foreground mt-1">Add questions to "{categoryName}" to see them here.</p>
              <Button onClick={() => router.push('/add-question')} className="mt-6">
                Add Questions
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-25rem)] pr-4"> {/* Adjust height as needed */}
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <Card key={q.id} className="p-4 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg text-primary">Q{index + 1}: {q.text}</p>
                        <ul className="list-disc list-inside pl-4 mt-2 text-sm text-muted-foreground">
                          {q.options.map(opt => (
                            <li key={opt.id} className={opt.id === q.correctAnswerId ? 'font-bold text-accent' : ''}>
                              {opt.text} {opt.id === q.correctAnswerId && "(Correct)"}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 ml-4 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(q)} title="Edit Question (coming soon)">
                          <Edit className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(q)} title="Delete Question">
                          <Trash2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
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
            <p className="text-sm text-muted-foreground">
                Found {questions.length} question(s) directly in category: "{categoryName}".
            </p>
        </CardFooter>
      </Card>

      {questionToDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete this question? <br />
                <strong className="text-primary mt-2 block">
                    {questionToDelete.text.substring(0,100)}{questionToDelete.text.length > 100 ? "..." : ""}
                </strong>
                <br />This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete Question
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
