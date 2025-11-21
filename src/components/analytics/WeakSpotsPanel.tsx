"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Target, TrendingDown } from 'lucide-react';
import type { WeakSpot } from '@/types';
import { useRouter } from 'next/navigation';

interface WeakSpotsPanelProps {
    weakSpots: WeakSpot[];
    onCreateQuiz?: () => void;
    isLoading?: boolean;
}

export function WeakSpotsPanel({ weakSpots, onCreateQuiz, isLoading = false }: WeakSpotsPanelProps) {
    const router = useRouter();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Weak Spots
                    </CardTitle>
                    <CardDescription>
                        Identifying areas that need more practice...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (weakSpots.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-green-600" />
                        Weak Spots
                    </CardTitle>
                    <CardDescription>
                        No weak spots identified yet!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">
                            Keep practicing quizzes to identify areas for improvement.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Top Weak Spots
                        </CardTitle>
                        <CardDescription>
                            Questions you struggle with most ({weakSpots.length} total)
                        </CardDescription>
                    </div>
                    {onCreateQuiz && weakSpots.length > 0 && (
                        <Button onClick={onCreateQuiz} size="sm">
                            <Target className="h-4 w-4 mr-2" />
                            Practice These
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {weakSpots.map((spot, index) => {
                        // Determine background and text colors based on accuracy for better contrast
                        const bgColor = spot.accuracy < 30 ? 'bg-red-950/40 border-red-800/50' :
                            spot.accuracy < 50 ? 'bg-orange-950/40 border-orange-800/50' :
                                'bg-yellow-950/40 border-yellow-800/50';

                        const textColor = spot.accuracy < 30 ? 'text-red-400' :
                            spot.accuracy < 50 ? 'text-orange-400' :
                                'text-yellow-400';

                        return (
                            <div
                                key={spot.questionId}
                                className={`p-4 rounded-lg border-2 ${bgColor} hover:brightness-110 transition-all`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Rank badge */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-xs font-semibold border-foreground/30 bg-background/50">
                                                #{index + 1}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs font-semibold bg-foreground/10">
                                                {spot.categoryName}
                                            </Badge>
                                        </div>

                                        {/* Question preview */}
                                        <p className="text-sm font-medium line-clamp-2 mb-2 text-foreground">
                                            {spot.question.text}
                                        </p>

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 text-xs text-foreground/70 font-medium">
                                            <span className="flex items-center gap-1">
                                                <TrendingDown className="h-3 w-3" />
                                                {Math.round(spot.accuracy)}% accuracy
                                            </span>
                                            <span>
                                                {spot.attempts} attempts
                                            </span>
                                        </div>
                                    </div>

                                    {/* Accuracy indicator */}
                                    <div className="flex flex-col items-center justify-center min-w-[80px]">
                                        <div className={`text-3xl font-bold ${textColor}`}>
                                            {Math.round(spot.accuracy)}%
                                        </div>
                                        <div className="text-xs text-foreground/60 font-medium">
                                            accuracy
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {weakSpots.length === 5 && (
                    <p className="text-xs text-muted-foreground text-center mt-4">
                        Showing top 5 weak spots
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
