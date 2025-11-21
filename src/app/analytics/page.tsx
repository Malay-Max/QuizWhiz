"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    BarChart3,
    Brain,
    Target,
    Trophy,
    TrendingUp,
    Loader2,
    AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getAllCategoryAnalytics,
    getWeakSpotsForUser,
    createWeakSpotQuiz,
    startReviewSession
} from '@/lib/srs-storage';
import { getAllCategories } from '@/lib/storage';
import { calculateOverallStats } from '@/lib/analytics';
import type { CategoryAnalytics, WeakSpot, Category } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { WeakSpotsPanel } from '@/components/analytics/WeakSpotsPanel';
import { MasteryMeter } from '@/components/analytics/MasteryMeter';

export default function AnalyticsPage() {
    const router = useRouter();
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();

    const [categoryAnalytics, setCategoryAnalytics] = useState<CategoryAnalytics[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

    useEffect(() => {
        if (isAuthLoading) return;

        if (!currentUser) {
            router.push('/login');
            return;
        }

        loadAnalyticsData();
    }, [currentUser, isAuthLoading, router]);

    const loadAnalyticsData = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            const [analyticsData, categoriesData, weakSpotsData] = await Promise.all([
                getAllCategoryAnalytics(currentUser.uid),
                getAllCategories(),
                getWeakSpotsForUser(currentUser.uid, 5),
            ]);

            setCategoryAnalytics(analyticsData);
            setCategories(categoriesData);
            setWeakSpots(weakSpotsData);
        } catch (error) {
            console.error('Error loading analytics:', error);
            toast({
                title: 'Error',
                description: 'Failed to load analytics data.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateWeakSpotQuiz = async () => {
        if (!currentUser) return;

        setIsCreatingQuiz(true);
        try {
            const questions = await createWeakSpotQuiz(currentUser.uid, 10);

            if (questions.length === 0) {
                toast({
                    title: 'No Questions',
                    description: 'Not enough weak spots to create a quiz.',
                });
                return;
            }

            // Start a review session with weak spot questions
            const result = await startReviewSession(currentUser.uid, questions);

            if (result.success && result.session) {
                router.push(`/quiz?mode=weak-spots&sessionId=${result.session.id}`);
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to create quiz.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error creating weak spot quiz:', error);
            toast({
                title: 'Error',
                description: 'Failed to create quiz from weak spots.',
                variant: 'destructive',
            });
        } finally {
            setIsCreatingQuiz(false);
        }
    };

    if (isAuthLoading || isLoading) {
        return (
            <div className="container max-w-6xl mx-auto py-8 px-4">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    const overallStats = calculateOverallStats(categoryAnalytics);

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                    <BarChart3 className="h-10 w-10 text-primary" />
                    Analytics Dashboard
                </h1>
                <p className="text-muted-foreground text-lg">
                    Track your learning progress and identify areas for improvement
                </p>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Brain className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold">{overallStats.totalQuestions}</p>
                                <p className="text-sm text-muted-foreground">Total Questions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Trophy className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold">{overallStats.totalMastered}</p>
                                <p className="text-sm text-muted-foreground">Mastered</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-purple-600" />
                            <div>
                                <p className="text-2xl font-bold">{Math.round(overallStats.overallAccuracy)}%</p>
                                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-8 w-8 text-orange-600" />
                            <div>
                                <p className="text-2xl font-bold">{overallStats.totalStruggling}</p>
                                <p className="text-sm text-muted-foreground">Struggling</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Weak Spots Panel */}
            <div className="mb-8">
                <WeakSpotsPanel
                    weakSpots={weakSpots}
                    onCreateQuiz={handleCreateWeakSpotQuiz}
                    isLoading={false}
                />
            </div>

            {/* Category Breakdown */}
            <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    Category Mastery
                </h2>

                {categoryAnalytics.length === 0 ? (
                    <Card>
                        <CardContent className="pt-16 py-16 text-center">
                            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
                            <p className="text-muted-foreground mb-6">
                                Complete some quizzes to see your analytics here.
                            </p>
                            <Button onClick={() => router.push('/categories')}>
                                Browse Categories
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryAnalytics.map((analytics) => {
                            const category = categories.find(c => c.id === analytics.categoryId);
                            return (
                                <MasteryMeter
                                    key={analytics.id}
                                    categoryName={category?.name || 'Unknown Category'}
                                    masteryPercentage={
                                        analytics.totalQuestions > 0
                                            ? (analytics.masteredQuestions / analytics.totalQuestions) * 100
                                            : 0
                                    }
                                    totalQuestions={analytics.totalQuestions}
                                    masteredCount={analytics.masteredQuestions}
                                    strugglingCount={analytics.strugglingQuestions}
                                    showDetails={true}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
