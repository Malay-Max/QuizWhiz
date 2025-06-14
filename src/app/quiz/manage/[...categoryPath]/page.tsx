
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Question } from '@/types'; // QuizSession removed as it's not directly used for StorableQuizSession format here
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
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { QuizSession as QuizSessionType } from '@/types'; // Renamed to avoid conflict if any

// Define markdown components locally for this page
const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-4 text-foreground" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold my-3 text-foreground" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg font-semibold my-2 text-foreground" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-2 leading-relaxed text-foreground" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-relaxed text-foreground" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-foreground" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-foreground" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <pre className={cn("p-2 my-2 bg-muted rounded-md overflow-x-auto font-code text-sm", className)} {...props}>
          <code>{String(children).replace(/\n$/, '')}</code>
        </pre>
      ) : (
        <code className={cn("px-1 py-0.5 bg-muted rounded font-code text-sm", className)} {...props}>
          {children}
        </code>
      )
    },
};


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

    const newSession: QuizSessionType = {
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
                disabled={questions.length === 0 || isLoading}
                size="lg"
                className="w-full sm:w-auto"
            >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" /> }
                 Start Quiz with this Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <p className="text-lg text-muted-foreground">Loading questions...</p>
            </div>
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
            <ScrollArea className="h-[calc(100vh-25rem)] pr-4">
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <Card key={q.id} className="p-4 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-grow mr-4 overflow-hidden"> {/* Added flex-grow, mr-4 and overflow-hidden */}
                        <div className="flex items-start text-lg text-primary">
                          <span className="font-semibold mr-1 shrink-0">Q{index + 1}:</span>
                          <div className="min-w-0"> {/* Added min-w-0 to allow markdown to wrap */}
                            <ReactMarkdown components={markdownComponents}>
                              {q.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <ul className="list-disc list-inside pl-4 mt-2 text-sm text-muted-foreground">
                          {q.options.map(opt => (
                            <li key={opt.id} className={cn('mt-1', opt.id === q.correctAnswerId ? 'font-bold text-accent' : '')}>
                                <div className="flex items-baseline">
                                  <div className="min-w-0"> {/* Added min-w-0 here as well */}
                                    <ReactMarkdown components={markdownComponents}>
                                        {opt.text}
                                    </ReactMarkdown>
                                  </div>
                                  {opt.id === q.correctAnswerId && <span className="ml-2 text-xs font-medium text-accent shrink-0">(Correct Answer)</span>}
                                </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 ml-auto sm:ml-4 shrink-0"> {/* Ensured buttons don't shrink and have margin */}
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(q)} title="Edit Question">
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
                <strong className="text-primary mt-2 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    <ReactMarkdown components={markdownComponents} className="inline">
                        {questionToDelete.text.substring(0,100)}{questionToDelete.text.length > 100 ? "..." : ""}
                    </ReactMarkdown>
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


    