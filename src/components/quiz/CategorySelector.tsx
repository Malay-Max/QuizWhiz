
"use client";

import { useState, useEffect } from 'react';
import { getCategories } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder } from 'lucide-react'; // Changed from Tag
import { useRouter } from 'next/navigation';

interface CategorySelectorProps {
  onSelectCategory: (category: string) => void;
}

export function CategorySelector({ onSelectCategory }: CategorySelectorProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadCategories = () => {
      try {
        setCategories(getCategories());
      } catch (error) {
        console.error("Failed to load categories:", error);
        setCategories([]); // Fallback to empty array on error
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

  if (categories.length === 0) {
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
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Select a Quiz Category</CardTitle>
        <CardDescription>Choose a category to start your quiz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((category) => (
          <Button
            key={category}
            onClick={() => onSelectCategory(category)}
            variant="outline"
            size="lg"
            className="w-full justify-start text-lg shadow-sm hover:bg-primary/10 hover:text-primary transition-all"
          >
            <Folder className="mr-3 h-5 w-5 text-primary/80" />
            {category}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
