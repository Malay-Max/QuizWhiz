
"use client";

import { useState, useEffect } from 'react';
import { getCategories, buildCategoryTree } from '@/lib/storage';
import type { CategoryTreeNode } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryTreeItem } from './CategoryTreeItem';
import { useRouter } from 'next/navigation';

interface CategorySelectorProps {
  onSelectCategory: (categoryPath: string) => void;
}

export function CategorySelector({ onSelectCategory }: CategorySelectorProps) {
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
        <CardTitle className="font-headline text-3xl">Select a Quiz Category</CardTitle>
        <CardDescription>Choose a category or sub-category to start your quiz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {categoryTree.map((node) => (
          <CategoryTreeItem
            key={node.path}
            node={node}
            onSelectCategory={onSelectCategory}
            level={0}
          />
        ))}
      </CardContent>
    </Card>
  );
}
