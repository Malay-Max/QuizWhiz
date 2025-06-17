
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Question, Category as CategoryType } from '@/types';
import { 
  getQuestionsByCategoryIdAndDescendants, 
  deleteQuestionById, 
  clearQuizSession,
  getAllCategories,
  getFullCategoryPath,
  updateCategoryName,
  deleteCategory
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { ArrowLeft, Edit, Trash2, Play, ListChecks, FolderOpen, Loader2, Save, X, Folder } from 'lucide-react';


export default function ManageCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const categoryIdFromParams = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;

  const [currentCategory, setCurrentCategory] = useState<CategoryType | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [isEditingCategoryName, setIsEditingCategoryName] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [directSubCategories, setDirectSubCategories] = useState<CategoryType[]>([]);
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

      const children = cats.filter(c => c.parentId === fetchedCategory.id)
                           .sort((a, b) => a.name.localeCompare(b.name));
      setDirectSubCategories(children);

      const fetchedQuestions = await getQuestionsByCategoryIdAndDescendants(categoryIdFromParams, cats);
      setQuestions(fetchedQuestions);
    } else {
      toast({ title: "Error", description: "Category not found.", variant: "destructive" });
      router.push('/'); 
    }
    setIsLoading(false);
  }, [categoryIdFromParams, router, toast]);

  useEffect(() => {
    loadCategoryAndQuestions();
  }, [loadCategoryAndQuestions]);

  const handleSaveCategoryName = async () => {
    if (!currentCategory || !categoryName.trim() || categoryName.trim() === currentCategory.name) {
      setIsEditingCategoryName(false);
      if (currentCategory) setCategoryName(currentCategory.name); 
      return;
    }
    const result = await updateCategoryName(currentCategory.id, categoryName.trim());
    if (result.success) {
      toast({ title: "Category Updated", description: "Category name saved successfully.", className: "bg-accent text-accent-foreground" });
      await loadCategoryAndQuestions();
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update category name.", variant: "destructive" });
      setCategoryName(currentCategory.name); 
    }
    setIsEditingCategoryName(false);
  };
  
  const handleDeleteCategory = async () => {
    if (!currentCategory) return;
    setShowDeleteCategoryConfirm(true);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!currentCategory) return;
    
    const result = await deleteCategory(currentCategory.id);
    setShowDeleteCategoryConfirm(false);

    if (result.success) {
      toast({ title: "Category Deleted", description: `Category "${currentCategory.name}" has been removed.`, className: "bg-accent text-accent-foreground" });
      router.push('/'); 
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
        description: `There are no questions in "${currentCategory?.name || 'this category'}" and its sub-categories to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    clearQuizSession(); 
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
                        <Button size="icon" variant="ghost" onClick={() => { setIsEditingCategoryName(false); if(currentCategory) setCategoryName(currentCategory.name);}} title="Cancel edit"><X className="h-5 w-5 text-red-600" /></Button>
                      </div>
                    ) : (
                      <span className="break-words mr-2" onClick={() => setIsEditingCategoryName(true)} title="Click to edit name">
                        Manage: {currentCategory?.name || 'Category'}
                      </span>
                    )}
                    {!isEditingCategoryName && currentCategory && <Button size="icon" variant="ghost" onClick={() => setIsEditingCategoryName(true)} title="Edit category name"><Edit className="h-4 w-4" /></Button>}
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
                    Start Quiz (Incl. Sub-categories)
                </Button>
                 <Button 
                    onClick={handleDeleteCategory} 
                    variant="destructive"
                    disabled={isLoading || !currentCategory}
                    size="sm"
                    className="w-full sm:w-auto text-sm sm:text-base"
                    title="Delete this category (if empty and no sub-categories)"
                >
                   <Trash2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Delete Category
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mr-2 sm:mr-3" />
                <p className="text-base sm:text-lg text-muted-foreground">Loading category details...</p>
            </div>
          ) : (
            <>
              {directSubCategories.length > 0 && (
                <div className="mb-6 shrink-0">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">Sub-categories</h3>
                  <div className="space-y-2">
                    {directSubCategories.map(subCat => (
                      <Button
                        key={subCat.id}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-2.5 px-3 shadow-sm hover:bg-primary/10 transition-colors"
                        onClick={() => router.push(`/quiz/manage/${subCat.id}`)}
                        title={`Manage sub-category: ${subCat.name}`}
                      >
                        <Folder className="mr-2 h-5 w-5 text-primary/80 flex-shrink-0" />
                        <span className="font-medium break-words">{subCat.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {directSubCategories.length > 0 && questions.length > 0 && (
                  <Separator className="my-4 sm:my-6 shrink-0" />
              )}

              {questions.length > 0 ? (
                <div className="flex flex-col flex-grow min-h-0">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground shrink-0">
                    Questions in "{currentCategory?.name || 'Current Category'}" (and its sub-categories)
                  </h3>
                  <ScrollArea className="flex-grow pr-2 sm:pr-4">
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
                </div>
              ) : directSubCategories.length === 0 ? ( 
                <div className="text-center py-10 shrink-0">
                  <ListChecks className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                  <p className="text-lg sm:text-xl font-semibold text-muted-foreground">
                    No sub-categories or questions found here.
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Add sub-categories via the "Add New Category" page, or add questions to "{currentCategory?.name || 'this category'}".
                  </p>
                  <Button onClick={() => router.push('/add-question')} className="mt-4 sm:mt-6 text-sm sm:text-base">
                    Add Questions to this Category
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs sm:text-sm text-muted-foreground">
                Found {questions.length} question(s) in category "{currentCategory?.name || 'Current'}" and its sub-categories. 
                Direct sub-categories: {directSubCategories.length}.
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
