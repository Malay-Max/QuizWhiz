'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Save, X, Edit2 } from 'lucide-react';
import { generateQuestionsFromTextAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { GeneratedQuestion } from '@/types';
import { addQuestion, getAllCategories } from '@/lib/storage';
import type { Category } from '@/types';

export default function GenerateQuestionsPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Input state
    const [sourceText, setSourceText] = useState('');
    const [categoryContext, setCategoryContext] = useState('');

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

    // Saving state
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Load categories on mount
    useState(() => {
        getAllCategories().then(setCategories);
    });

    const handleGenerate = async () => {
        if (sourceText.trim().length < 50) {
            toast({
                title: 'Text Too Short',
                description: 'Please provide at least 50 characters of study notes.',
                variant: 'destructive',
            });
            return;
        }

        setIsGenerating(true);
        try {
            const result = await generateQuestionsFromTextAction({
                sourceText,
                categoryContext: categoryContext || undefined,
            });

            if (result.success && result.data) {
                setGeneratedQuestions(result.data.questions);
                toast({
                    title: 'Questions Generated!',
                    description: `Successfully generated ${result.data.questions.length} questions.`,
                    className: 'bg-accent text-accent-foreground',
                });
            } else {
                toast({
                    title: 'Generation Failed',
                    description: result.error || 'Failed to generate questions.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAll = async () => {
        if (!selectedCategory) {
            toast({
                title: 'No Category Selected',
                description: 'Please select a category to save questions to.',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        let savedCount = 0;

        try {
            for (const q of generatedQuestions) {
                // Find the correct answer text
                const correctOption = q.options.find(opt => opt.id === q.correctAnswerId);
                if (!correctOption) {
                    console.warn('Could not find correct answer for question:', q.questionText);
                    continue;
                }

                const result = await addQuestion({
                    text: q.questionText,
                    options: q.options,
                    correctAnswerId: q.correctAnswerId,
                    categoryId: selectedCategory,
                    explanation: q.explanation || null,
                    source: q.source,
                });

                if (result.success) {
                    savedCount++;
                }
            }

            toast({
                title: 'Questions Saved!',
                description: `Successfully saved ${savedCount} of ${generatedQuestions.length} questions.`,
                className: 'bg-accent text-accent-foreground',
            });

            router.push('/');
        } catch (error) {
            toast({
                title: 'Save Error',
                description: 'An error occurred while saving questions.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const removeQuestion = (index: number) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl sm:text-3xl flex items-center gap-2">
                        <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                        Generate Questions from Text
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                        Paste your study notes and let AI create quiz questions for you
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="source-text">Study Notes / Text</Label>
                            <Textarea
                                id="source-text"
                                value={sourceText}
                                onChange={(e) => setSourceText(e.target.value)}
                                placeholder="Paste your study notes here... (minimum 50 characters)"
                                className="min-h-[200px] mt-1.5"
                                disabled={isGenerating}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {sourceText.length} characters
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="context">Subject (Optional)</Label>
                            <Input
                                id="context"
                                value={categoryContext}
                                onChange={(e) => setCategoryContext(e.target.value)}
                                placeholder="e.g., English Literature, Literary Theory"
                                className="mt-1.5"
                                disabled={isGenerating}
                            />
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating || sourceText.trim().length < 50}
                            className="w-full sm:w-auto"
                            size="lg"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Generate Questions
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Generated Questions Section */}
                    {generatedQuestions.length > 0 && (
                        <div className="space-y-4 pt-6 border-t">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <h3 className="text-lg font-semibold">
                                    Generated Questions ({generatedQuestions.length})
                                </h3>

                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-full sm:w-[220px]">
                                            <SelectValue placeholder="Select category to save" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.fullPath || cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        onClick={handleSaveAll}
                                        disabled={isSaving || !selectedCategory}
                                        variant="default"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save All
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Question Cards */}
                            <div className="space-y-4">
                                {generatedQuestions.map((q, index) => (
                                    <Card key={index} className="bg-muted/30">
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <CardTitle className="text-base font-semibold">
                                                    Q{index + 1}: {q.questionText}
                                                </CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeQuestion(index)}
                                                    className="shrink-0"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 pt-0">
                                            {q.options.map((opt) => (
                                                <div
                                                    key={opt.id}
                                                    className={`p-2 rounded text-sm ${opt.id === q.correctAnswerId
                                                        ? 'bg-accent/20 border border-accent font-medium'
                                                        : 'bg-background'
                                                        }`}
                                                >
                                                    {opt.text}
                                                    {opt.id === q.correctAnswerId && (
                                                        <span className="ml-2 text-xs text-accent">✓ Correct</span>
                                                    )}
                                                </div>
                                            ))}
                                            {q.explanation && (
                                                <p className="text-xs text-muted-foreground pt-2 italic">
                                                    <strong>Explanation:</strong> {q.explanation}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Difficulty:</strong> {q.difficulty}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => router.push('/')}>
                        Cancel
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
