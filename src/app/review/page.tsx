"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Calendar, Clock, PlayCircle, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDueReviewQuestions, getReviewQueueCount, startReviewSession } from '@/lib/srs-storage';
import type { Question } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function ReviewDeckPage() {
    const router = useRouter();
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();

    const [dueQuestions, setDueQuestions] = useState<Question[]>([]);
    const [totalDue, setTotalDue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        if (isAuthLoading) return;

        if (!currentUser) {
            router.push('/login');
            return;
        }

        loadReviewData();
    }, [currentUser, isAuthLoading, router]);

    const loadReviewData = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            const [questions, count] = await Promise.all([
                getDueReviewQuestions(currentUser.uid, 10), // Preview 10 questions
                getReviewQueueCount(currentUser.uid),
            ]);

            setDueQuestions(questions);
            setTotalDue(count);
        } catch (error) {
            console.error('Error loading review data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load review questions.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartReview = async () => {
        if (!currentUser || dueQuestions.length === 0) return;

        setIsStarting(true);
        try {
            const result = await startReviewSession(currentUser.uid, dueQuestions);

            if (result.success && result.session) {
                // Navigate to quiz page in review mode
                router.push(`/quiz?mode=review&sessionId=${result.session.id}`);
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to start review session.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error starting review:', error);
            toast({
                title: 'Error',
                description: 'Failed to start review session.',
                variant: 'destructive',
            });
        } finally {
            setIsStarting(false);
        }
    };

    if (isAuthLoading || isLoading) {
        return (
            <div className="container max-w-4xl mx-auto py-8 px-4">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                    <Brain className="h-10 w-10 text-primary" />
                    Review Deck
                </h1>
                <p className="text-muted-foreground text-lg">
                    Spaced repetition review for optimal retention
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold">{totalDue}</p>
                                <p className="text-sm text-muted-foreground">Due for Review</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold">~{Math.ceil(totalDue * 0.5)}</p>
                                <p className="text-sm text-muted-foreground">Minutes Est.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-purple-600" />
                            <div>
                                <p className="text-2xl font-bold">SRS</p>
                                <p className="text-sm text-muted-foreground">Smart Scheduling</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            {totalDue === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Brain className="h-16 w-16 mx-auto mb-4 text-green-600" />
                        <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
                        <p className="text-muted-foreground mb-6">
                            No questions are due for review right now.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Complete more quizzes or check back later for scheduled reviews.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Start Review Card */}
                    <Card className="border-2 border-primary">
                        <CardHeader>
                            <CardTitle>Ready to Review</CardTitle>
                            <CardDescription>
                                Review {totalDue} question{totalDue !== 1 ? 's' : ''} to strengthen your memory
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleStartReview}
                                disabled={isStarting}
                                size="lg"
                                className="w-full"
                            >
                                {isStarting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="mr-2 h-5 w-5" />
                                        Start Review Session
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preview Questions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Preview</CardTitle>
                            <CardDescription>
                                First {Math.min(dueQuestions.length, 10)} questions in your review queue
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {dueQuestions.slice(0, 10).map((question, index) => (
                                    <div
                                        key={question.id}
                                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Badge variant="outline" className="mt-0.5">
                                                {index + 1}
                                            </Badge>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm line-clamp-2">{question.text}</p>
                                                {question.categoryName && (
                                                    <Badge variant="secondary" className="mt-2 text-xs">
                                                        {question.categoryName}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalDue > 10 && (
                                <p className="text-xs text-muted-foreground text-center mt-4">
                                    +{totalDue - 10} more questions in queue
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                                <Brain className="h-4 w-4" />
                                How Review Works
                            </h3>
                            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                                <li>Questions are scheduled based on your performance</li>
                                <li>Correct answers → longer intervals (e.g., 1 day, 3 days, 7 days)</li>
                                <li>Incorrect answers → shorter intervals (1 min, 1 hour, 1 day)</li>
                                <li>Track confidence to fine-tune your schedule</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
