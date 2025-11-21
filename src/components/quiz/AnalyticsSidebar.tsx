"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Clock, Target, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAllCategoryAnalytics } from '@/lib/srs-storage';
import type { CategoryAnalytics } from '@/types';

interface QuickStats {
    totalQuestions: number;
    overallAccuracy: number;
    averageTime: number;
    topCategory: { name: string; accuracy: number } | null;
}

export function AnalyticsSidebar() {
    const router = useRouter();
    const { currentUser } = useAuth();
    const [stats, setStats] = useState<QuickStats>({
        totalQuestions: 0,
        overallAccuracy: 0,
        averageTime: 0,
        topCategory: null,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAnalytics = async () => {
            if (!currentUser) {
                setIsLoading(false);
                return;
            }

            try {
                const analytics = await getAllCategoryAnalytics(currentUser.uid);

                // Calculate overall stats
                const totalQuestions = analytics.reduce((sum: number, cat: CategoryAnalytics) => sum + cat.totalQuestions, 0);
                const totalCorrect = analytics.reduce((sum: number, cat: CategoryAnalytics) =>
                    sum + (cat.totalQuestions * cat.averageAccuracy / 100), 0
                );
                const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

                // Placeholder for average time since CategoryAnalytics doesn't track this yet
                const averageTime = 0;

                // Find top performing category
                const topCategory = analytics.length > 0
                    ? analytics.reduce((best: CategoryAnalytics, cat: CategoryAnalytics) =>
                        cat.averageAccuracy > best.averageAccuracy ? cat : best
                    )
                    : null;

                setStats({
                    totalQuestions,
                    overallAccuracy,
                    averageTime,
                    topCategory: topCategory ? {
                        name: topCategory.categoryId, // Using categoryId as placeholder for name
                        accuracy: topCategory.averageAccuracy
                    } : null,
                });
            } catch (error) {
                console.error('Error loading analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnalytics();
    }, [currentUser]);

    if (!currentUser) {
        return (
            <aside className="hidden lg:block w-64 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Analytics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground text-center py-4">
                            Log in to view analytics
                        </p>
                    </CardContent>
                </Card>
            </aside>
        );
    }

    return (
        <aside className="hidden lg:block w-64 space-y-4">
            {/* Overall Accuracy Card */}
            <Card className="border-blue-500/50 bg-blue-950/20">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        Overall Accuracy
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center space-y-2">
                        <div className="text-4xl font-bold text-blue-500">
                            {isLoading ? '...' : `${Math.round(stats.overallAccuracy)}%`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            across {stats.totalQuestions} questions
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Top Category Card */}
            {stats.topCategory && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Best Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium truncate">
                                    {stats.topCategory.name}
                                </span>
                                <Badge className="bg-green-950/40 text-green-400 border-green-800/50">
                                    {Math.round(stats.topCategory.accuracy)}%
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Your strongest area
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Quick Stats
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Total Questions
                        </span>
                        <span className="text-sm font-semibold">
                            {stats.totalQuestions}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Avg. Time
                        </span>
                        <span className="text-sm font-semibold">
                            {stats.averageTime > 0 ? `${Math.round(stats.averageTime)}s` : '--'}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* View Full Analytics Button */}
            <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => router.push('/analytics')}
            >
                View Full Analytics
                <ArrowRight className="h-3 w-3 ml-2" />
            </Button>
        </aside>
    );
}
