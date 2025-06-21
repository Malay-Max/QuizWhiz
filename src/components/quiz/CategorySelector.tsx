
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getAllCategories, buildCategoryTree, addCategory, getFullCategoryPath } from '@/lib/storage';
import type { Category as CategoryType } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryTreeItem } from './CategoryTreeItem';
import { useRouter } from 'next/navigation';
import { Zap, Loader2, ListTree, PlusCircle, Folder } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CategorySelectorProps {
  onCategoryAction: (categoryId: string) => void;
  onStartRandomQuiz: (count?: number) => void;
}

export const ALL_QUESTIONS_RANDOM_KEY = "__ALL_QUESTIONS_RANDOM__";

export function CategorySelector({ onCategoryAction, onStartRandomQuiz }: CategorySelectorProps) {
  const [categoryTree, setCategoryTree] = useState<CategoryType[]>([]);
  const [allStoredCategories, setAllStoredCategories] = useState<CategoryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [randomQuizCountInput, setRandomQuizCountInput] = useState<string>('');
  const router = useRouter();
  const { toast } = useToast();

  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryOptionsForSelect, setCategoryOptionsForSelect] = useState<Array<{ id: string, name: string }>>([]);

  // New state for parent category search
  const [parentCategorySearchTerm, setParentCategorySearchTerm] = useState('');
  const [filteredParentSuggestions, setFilteredParentSuggestions] = useState<Array<{ id: string, name: string }>>([]);

  const loadCategoriesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allCats = await getAllCategories();
      setAllStoredCategories(allCats); 
      const tree = buildCategoryTree(allCats);
      setCategoryTree(tree);

      const options = allCats.map(cat => ({
        id: cat.id,
        name: getFullCategoryPath(cat.id, allCats) || cat.name,
      })).sort((a, b) => a.name.localeCompare(b.name));
      setCategoryOptionsForSelect(options);

    } catch (error) {
      console.error("Failed to load or build category tree:", error);
      setCategoryTree([]);
      setCategoryOptionsForSelect([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategoriesData();
  }, [loadCategoriesData]);

  // Effect for parent category search
  useEffect(() => {
    if (parentCategorySearchTerm.trim() !== '') {
        const lowercasedInput = parentCategorySearchTerm.toLowerCase();
        const suggestions = categoryOptionsForSelect
            .filter(catOpt => catOpt.name.toLowerCase().includes(lowercasedInput))
            .slice(0, 5); // Limit suggestions to 5
        setFilteredParentSuggestions(suggestions);
    } else {
        setFilteredParentSuggestions([]);
    }
    // If user clears the input, reset the parentId
    if (parentCategorySearchTerm.trim() === '') {
        setNewCategoryParentId(null);
    }
  }, [parentCategorySearchTerm, categoryOptionsForSelect]);

  const handleRandomQuizButtonClick = () => {
    const count = parseInt(randomQuizCountInput, 10);
    onStartRandomQuiz(isNaN(count) || count <= 0 ? undefined : count);
  };
  
  const handleParentSuggestionClick = (categoryOpt: { id: string, name: string }) => {
    setNewCategoryParentId(categoryOpt.id);
    setParentCategorySearchTerm(categoryOpt.name);
    setFilteredParentSuggestions([]); // Hide suggestions after selection
  };

  const handleAddNewCategoryInternal = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Category Name Required", description: "Please enter a name for the new category.", variant: "destructive" });
      return;
    }
    setIsAddingCategory(true);
    const result = await addCategory(newCategoryName, newCategoryParentId);
    setIsAddingCategory(false);
    if (result.success && result.id) {
      toast({ title: "Category Added", description: `Category "${newCategoryName}" created.`, className: "bg-accent text-accent-foreground" });
      setNewCategoryName('');
      setNewCategoryParentId(null);
      setParentCategorySearchTerm('');
      setShowAddCategoryForm(false); 
      await loadCategoriesData(); 
    } else {
      toast({ title: "Failed to Add Category", description: result.error || "Could not create category.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl sm:text-2xl flex items-center">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading Categories...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 pt-4">
            <div className="h-8 bg-muted rounded-md animate-pulse"></div>
            <div className="h-8 bg-muted rounded-md w-5/6 animate-pulse delay-75"></div>
            <div className="h-8 bg-muted rounded-md w-4/6 animate-pulse delay-150"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const noCategoriesExist = allStoredCategories.length === 0;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl sm:text-3xl">Select a Quiz or Manage Category</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Choose a category to manage its questions, or add new categories below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="random-quiz-count" className="text-xs sm:text-sm font-medium">Number of Random Questions (Optional)</Label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Input
              id="random-quiz-count"
              type="number"
              value={randomQuizCountInput}
              onChange={(e) => setRandomQuizCountInput(e.target.value)}
              placeholder="All"
              className="flex-grow sm:max-w-[120px] text-sm sm:text-base h-11"
              min="1"
              disabled={noCategoriesExist && categoryTree.length === 0}
            />
            <Button
              onClick={handleRandomQuizButtonClick}
              variant="default"
              size="lg"
              className="w-full sm:flex-1 shadow-md hover:scale-105 transition-transform text-sm sm:text-base h-11"
              disabled={noCategoriesExist && categoryTree.length === 0}
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Random Quiz
            </Button>
          </div>
        </div>

        {categoryTree.length === 0 && !showAddCategoryForm && !noCategoriesExist && (
           <p className="text-center text-muted-foreground py-4">No top-level categories found. Add one below.</p>
        )}
        
        {categoryTree.length > 0 && (
          <div className="pt-3 space-y-1">
            {categoryTree.map((node) => (
              <CategoryTreeItem
                key={node.id}
                node={node}
                onSelectNode={onCategoryAction} 
                level={0}
              />
            ))}
          </div>
        )}

        {showAddCategoryForm && (
          <div className="mt-6 p-4 border rounded-lg shadow-sm space-y-4 bg-card animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Add New Category</h3>
            <div>
              <Label htmlFor="new-category-name-inline">New Category Name</Label>
              <Input
                id="new-category-name-inline"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Modern Poetry"
                className="mt-1 text-sm md:text-base"
              />
            </div>
            <div>
              <Label htmlFor="new-category-parent-inline">Parent Category (Optional)</Label>
               <Input
                  id="new-category-parent-inline"
                  value={parentCategorySearchTerm}
                  onChange={(e) => setParentCategorySearchTerm(e.target.value)}
                  placeholder="Search for a parent category..."
                  className="mt-1 text-sm md:text-base"
                  autoComplete="off"
                  disabled={categoryOptionsForSelect.length === 0}
              />
              {filteredParentSuggestions.length > 0 && (
                  <div className="mt-2 border rounded-md bg-background shadow-md p-2">
                      <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
                      <div className="flex flex-wrap gap-1">
                          {filteredParentSuggestions.map(catOpt => (
                              <Button
                                  key={`parent-sugg-${catOpt.id}`}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleParentSuggestionClick(catOpt)}
                                  className="text-xs px-2 py-1 h-auto whitespace-normal"
                              >
                                  <Folder className="mr-1.5 h-3 w-3 shrink-0" />
                                  <span className="min-w-0 break-all">{catOpt.name}</span>
                              </Button>
                          ))}
                      </div>
                  </div>
              )}
              {categoryOptionsForSelect.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No parent categories available to select.</p>
              )}
            </div>
            <Button onClick={handleAddNewCategoryInternal} disabled={isAddingCategory || !newCategoryName.trim()} className="w-full text-sm sm:text-base">
              {isAddingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Confirm Add Category
            </Button>
          </div>
        )}

        {(noCategoriesExist && !showAddCategoryForm) && (
           <Card className="w-full max-w-md mx-auto shadow-lg my-6">
            <CardHeader>
              <CardTitle className="font-headline text-xl sm:text-2xl">No Quizzes Available</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm sm:text-base">
                It looks like there are no questions or categories added yet.
              </p>
            </CardContent>
           </Card>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button onClick={() => router.push('/add-question')} className="w-full sm:flex-1 text-sm sm:text-base" variant="outline">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Questions
        </Button>
        <Button onClick={() => setShowAddCategoryForm(!showAddCategoryForm)} className="w-full sm:flex-1 text-sm sm:text-base" variant="outline">
          <ListTree className="mr-2 h-5 w-5" /> {showAddCategoryForm ? 'Cancel Add Category' : 'Add New Category'}
        </Button>
      </CardFooter>
    </Card>
  );
}
