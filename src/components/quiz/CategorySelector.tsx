
"use client";

import { useState, useEffect } from 'react';
import { getCategories, buildCategoryTree } from '@/lib/storage';
import type { CategoryTreeNode } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryTreeItem } from './CategoryTreeItem';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

interface CategorySelectorProps {
  onCategoryAction: (categoryPath: string, isLeafNode: boolean) => void; // Updated prop
  onStartRandomQuiz: () => void; // Specific handler for random quiz
}

export const ALL_QUESTIONS_RANDOM_KEY = "__ALL_QUESTIONS_RANDOM__";

export function CategorySelector({ onCategoryAction, onStartRandomQuiz }: CategorySelectorProps) {
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadCategories = () => {
      try {
        const flatCategories = getCategories();
        const tree = buildCategoryTree(flatCategories);
        setCategoryTree(tree);
      } catch (error) {
        console.error("Failed to load or build category tree:", error);
        setCategoryTree([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCategories();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Loading Categories...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded-md"></div>
            <div className="h-8 bg-muted rounded-md w-5/6"></div>
            <div className="h-8 bg-muted rounded-md w-4/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categoryTree.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">No Quizzes Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            It looks like there are no questions added yet. Please add some questions first.
          </p>
          <Button onClick={() => router.push('/add-question')} className="mt-4 w-full">
            Add Questions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Select a Quiz or Manage Category</CardTitle>
        <CardDescription>
          Choose a category branch to start a quiz, a specific sub-category to manage its questions, or try a random mix.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={onStartRandomQuiz}
          variant="default"
          size="lg"
          className="w-full shadow-md hover:scale-105 transition-transform"
        >
          <Zap className="mr-2 h-5 w-5" />
          Start Random Quiz (All Questions)
        </Button>
        
        <div className="pt-3 space-y-1">
          {categoryTree.map((node) => (
            <CategoryTreeItem
              key={node.path}
              node={node}
              onSelectNode={onCategoryAction} // Pass the updated handler
              level={0}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => router.push('/add-question')} className="w-full" variant="outline">
            Add New Questions
        </Button>
      </CardFooter>
    </Card>
  );
}
