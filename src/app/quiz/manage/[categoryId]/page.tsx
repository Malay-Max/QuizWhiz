
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Question, QuizSession, Category as CategoryType } from '@/types';
import { 
  getQuestionsByCategoryIdAndDescendants, 
  deleteQuestionById, 
  saveQuizSession, 
  clearQuizSession,
  getAllCategories,
  getCategoryById,
  getFullCategoryPath,
  updateCategoryName,
  deleteCategory
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ArrowLeft, Edit, Trash2, Play, ListChecks, FolderOpen, Loader2, Save, X } from 'lucide-react';


export default function ManageCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const categoryIdFromParams = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;

  const [currentCategory, setCurrentCategory] = useState<CategoryType | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [isEditingCategoryName, setIsEditingCategoryName] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [showDeleteQuestionConfirm, setShowDeleteQuestionConfirm] = useState(false);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);


  const loadCategoryAndQuestions = useCallback(async () => {
    if (!categoryIdFromParams) return;
    setIsLoading(true);
    
    const cats = await getAllCategories();
    setAllCategories(cats);
    
    const fetchedCategory = cats.find(c => c.id === categoryIdFromParams);
    if (fetchedCategory) {
      setCurrentCategory(fetchedCategory);
      setCategoryName(fetchedCategory.name);
      const fetchedQuestions = await getQuestionsByCategoryIdAndDescendants(categoryIdFromParams, cats);
      setQuestions(fetchedQuestions);
    } else {
      toast({ title: "Error", description: "Category not found.", variant: "destructive" });
      router.push('/'); // Redirect if category doesn't exist
    }
    setIsLoading(false);
  }, [categoryIdFromParams, router, toast]);

  useEffect(() => {
    loadCategoryAndQuestions();
  }, [loadCategoryAndQuestions]);

  const handleSaveCategoryName = async () => {
    if (!currentCategory || !categoryName.trim() || categoryName.trim() === currentCategory.name) {
      setIsEditingCategoryName(false);
      if (currentCategory) setCategoryName(currentCategory.name); // Reset if unchanged or empty
      return;
    }
    const result = await updateCategoryName(currentCategory.id, categoryName.trim());
    if (result.success) {
      toast({ title: "Category Updated", description: "Category name saved successfully.", className: "bg-accent text-accent-foreground" });
      // Refresh data
      await loadCategoryAndQuestions();
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update category name.", variant: "destructive" });
      setCategoryName(currentCategory.name); // Revert on failure
    }
    setIsEditingCategoryName(false);
  };
  
  const handleDeleteCategory = async () => {
    if (!currentCategory) return;
    setShowDeleteCategoryConfirm(true);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!currentCategory) return;
    
    // Note: deleteCategory now checks for children/questions.
    // If it has children or questions, it will return an error.
    // This dialog should reflect that, or the delete logic needs to be more advanced (cascade).
    const result = await deleteCategory(currentCategory.id);
    setShowDeleteCategoryConfirm(false);

    if (result.success) {
      toast({ title: "Category Deleted", description: `Category "${currentCategory.name}" has been removed.`, className: "bg-accent text-accent-foreground" });
      router.push('/'); // Navigate away as the category is gone
    } else {
      toast({ title: "Deletion Failed", description: result.error || "Could not delete the category. It might have sub-categories or questions.", variant: "destructive" });
    }
  };


  const handleDeleteQuestionClick = (question: Question) => {
    setQuestionToDelete(question);
    setShowDeleteQuestionConfirm(true);
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    const deleteResult = await deleteQuestionById(questionToDelete.id);
    setShowDeleteQuestionConfirm(false);
    setQuestionToDelete(null);

    if (deleteResult.success) {
        toast({
          title: 'Question Deleted',
          description: `"${questionToDelete.text.substring(0, 30)}..." has been removed.`,
        });
        await loadCategoryAndQuestions(); 
    } else {
        toast({
          title: 'Deletion Failed',
          description: deleteResult.error || 'Could not delete the question.',
          variant: 'destructive',
        });
    }
  };

  const handleStartQuizForThisCategory = async () => {
    if (!currentCategory || questions.length === 0) {
      toast({
        title: "No Questions",
        description: `There are no questions in "${currentCategory?.name || 'this category'}" to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    clearQuizSession(); 
    // Navigate to quiz page with categoryId to start
    router.push(`/?categoryId=${currentCategory.id}`); 
  };
  
  const handleEditQuestionClick = (question: Question) => {
    router.push(`/add-question?editId=${question.id}`);
  };

  const fullPathDisplay = currentCategory ? getFullCategoryPath(currentCategory.id, allCategories) : 'Loading...';

  return (
    <div className="container mx-auto py-4 sm:py-8">
      <Button variant="outline" onClick={() => router.push('/')} className="mb-4 sm:mb-6 text-sm sm:text-base">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quiz Selection
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex-grow min-w-0">
                <CardTitle className="font-headline text-lg sm:text-xl md:text-2xl flex items-center">
                    <FolderOpen className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" /> 
                    {isEditingCategoryName && currentCategory ? (
                      <div className="flex items-center gap-2">
                        <Input 
                          value={categoryName} 
                          onChange={(e) => setCategoryName(e.target.value)}
                          className="text-lg sm:text-xl md:text-2xl h-auto p-1"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" onClick={handleSaveCategoryName} title="Save name"><Save className="h-5 w-5 text-green-600" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { setIsEditingCategoryName(false); setCategoryName(currentCategory.name);}} title="Cancel edit"><X className="h-5 w-5 text-red-600" /></Button>
                      </div>
                    ) : (
                      <span className="break-words mr-2" onClick={() => setIsEditingCategoryName(true)} title="Click to edit name">
                        Manage: {currentCategory?.name || 'Category'}
                      </span>
                    )}
                    {!isEditingCategoryName && <Button size="icon" variant="ghost" onClick={() => setIsEditingCategoryName(true)} title="Edit category name"><Edit className="h-4 w-4" /></Button>}
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm break-all">
                    Path: {fullPathDisplay} (ID: {currentCategory?.id || 'N/A'})
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button 
                    onClick={handleStartQuizForThisCategory} 
                    disabled={questions.length === 0 || isLoading}
                    size="sm" 
                    className="w-full sm:w-auto text-sm sm:text-base"
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> }
                    Start Quiz With This Category
                </Button>
                 <Button 
                    onClick={handleDeleteCategory} 
                    variant="destructive"
                    disabled={isLoading}
                    size="sm"
                    className="w-full sm:w-auto text-sm sm:text-base"
                    title="Delete this category (if empty and no sub-categories)"
                >
                   <Trash2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Delete Category
                </Button>
            </div>
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
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Add questions to "{currentCategory?.name || 'this category'}" to see them.</p>
              <Button onClick={() => router.push('/add-question')} className="mt-4 sm:mt-6 text-sm sm:text-base">
                Add Questions
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-24rem)] sm:h-[calc(100vh-27rem)] pr-2 sm:pr-4">
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
                        <Button variant="outline" size="sm" onClick={() => handleEditQuestionClick(q)} title="Edit Question" className="flex-1 sm:flex-initial">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteQuestionClick(q)} title="Delete Question" className="flex-1 sm:flex-initial">
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
                Found {questions.length} question(s) in category "{currentCategory?.name || 'Current'}" and its sub-categories.
            </p>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteQuestionConfirm} onOpenChange={setShowDeleteQuestionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Are you sure you want to permanently delete this question? <br />
              <strong className="text-primary mt-2 block break-words">
                  {questionToDelete?.text.substring(0,100)}{questionToDelete && questionToDelete.text.length > 100 ? "..." : ""}
              </strong>
              <br />This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteQuestionConfirm(false)} className="text-sm sm:text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteQuestion} className="bg-destructive hover:bg-destructive/90 text-sm sm:text-base">
              Delete Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteCategoryConfirm} onOpenChange={setShowDeleteCategoryConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Confirm Category Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Are you sure you want to permanently delete the category: <br />
              <strong className="text-primary mt-2 block break-words">
                  {currentCategory?.name}
              </strong>?
              <br />This action cannot be undone. This will only succeed if the category has no sub-categories and no questions directly linked to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteCategoryConfirm(false)} className="text-sm sm:text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCategory} className="bg-destructive hover:bg-destructive/90 text-sm sm:text-base">
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
