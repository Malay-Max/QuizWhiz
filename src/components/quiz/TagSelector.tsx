"use client";

import { useState, useEffect } from 'react';
import { getTags } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag } from 'lucide-react';

interface TagSelectorProps {
  onSelectTag: (tag: string) => void;
}

export function TagSelector({ onSelectTag }: TagSelectorProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTags = () => {
      try {
        setTags(getTags());
      } catch (error) {
        console.error("Failed to load tags:", error);
        setTags([]); // Fallback to empty array on error
      } finally {
        setIsLoading(false);
      }
    };
    loadTags();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Loading Tags...</CardTitle>
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

  if (tags.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">No Quizzes Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            It looks like there are no questions added yet. Please add some questions first.
          </p>
          <Button onClick={() => window.location.href = '/'} className="mt-4 w-full">
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
        <CardDescription>Choose a tag to start your quiz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tags.map((tag) => (
          <Button
            key={tag}
            onClick={() => onSelectTag(tag)}
            variant="outline"
            size="lg"
            className="w-full justify-start text-lg shadow-sm hover:bg-primary/10 hover:text-primary transition-all"
          >
            <Tag className="mr-3 h-5 w-5 text-primary/80" />
            {tag}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
