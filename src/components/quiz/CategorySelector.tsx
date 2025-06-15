
"use client";

import { useState, useEffect } from 'react';
import { getCategories, buildCategoryTree } from '@/lib/storage';
import type { CategoryTreeNode } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryTreeItem } from './CategoryTreeItem';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label'; 

interface CategorySelectorProps {
  onCategoryAction: (categoryPath: string, isLeafNode: boolean) => void;
  onStartRandomQuiz: (count?: number) => void; 
}

export const ALL_QUESTIONS_RANDOM_KEY = "__ALL_QUESTIONS_RANDOM__";

export function CategorySelector({ onCategoryAction, onStartRandomQuiz }: CategorySelectorProps) {
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [randomQuizCountInput, setRandomQuizCountInput] = useState<string>(''); 
  const router = useRouter();

  useEffect(() => {
    const loadCategoriesData = async () => {
      setIsLoading(true);
      try {
        const flatCategories = await getCategories();
        const tree = buildCategoryTree(flatCategories);
        setCategoryTree(tree);
      } catch (error) {
        console.error("Failed to load or build category tree:", error);
        setCategoryTree([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCategoriesData();
  }, []);

  const handleRandomQuizButtonClick = () => {
    const count = parseInt(randomQuizCountInput, 10);
    onStartRandomQuiz(isNaN(count) || count <= 0 ? undefined : count);
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

  if (categoryTree.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl sm:text-2xl">No Quizzes Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm sm:text-base">
            It looks like there are no questions added yet. Please add some questions first.
          </p>
          <Button onClick={() => router.push('/add-question')} className="mt-4 w-full text-sm sm:text-base">
            Add Questions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl sm:text-3xl">Select a Quiz or Manage Category</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Choose a category branch to start a quiz, a specific sub-category to manage its questions, or try a random mix.
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
            />
            <Button
              onClick={handleRandomQuizButtonClick}
              variant="default"
              size="lg"
              className="w-full sm:flex-1 shadow-md hover:scale-105 transition-transform text-sm sm:text-base"
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Random Quiz
            </Button>
          </div>
        </div>
        
        <div className="pt-3 space-y-1">
          {categoryTree.map((node) => (
            <CategoryTreeItem
              key={node.path}
              node={node}
              onSelectNode={onCategoryAction}
              level={0}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => router.push('/add-question')} className="w-full text-sm sm:text-base" variant="outline">
            Add New Questions
        </Button>
      </CardFooter>
    </Card>
  );
}
