"use client";

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MasteryMeterProps {
    categoryName: string;
    masteryPercentage: number;
    totalQuestions: number;
    masteredCount: number;
    strugglingCount: number;
    showDetails?: boolean;
    className?: string;
}

export function MasteryMeter({
    categoryName,
    masteryPercentage,
    totalQuestions,
    masteredCount,
    strugglingCount,
    showDetails = true,
    className,
}: MasteryMeterProps) {
    // Determine color based on mastery level
    const getMasteryColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-blue-600';
        if (percentage >= 40) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getMasteryLabel = (percentage: number) => {
        if (percentage >= 80) return 'Excellent';
        if (percentage >= 60) return 'Good';
        if (percentage >= 40) return 'Learning';
        return 'Needs Practice';
    };

    const inProgressCount = totalQuestions - masteredCount - strugglingCount;

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-5 w-5" />
                    Mastery: {categoryName}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Mastery percentage display */}
                <div className="flex items-baseline justify-between">
                    <div>
                        <span className={cn("text-3xl font-bold", getMasteryColor(masteryPercentage))}>
                            {Math.round(masteryPercentage)}%
                        </span>
                        <span className="ml-2 text-sm text-muted-foreground">
                            {getMasteryLabel(masteryPercentage)}
                        </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {masteredCount} / {totalQuestions} mastered
                    </div>
                </div>

                {/* Progress bar */}
                <Progress
                    value={masteryPercentage}
                    className="h-3"
                />

                {/* Detailed breakdown */}
                {showDetails && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        {/* Mastered */}
                        <div className="flex flex-col items-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <Trophy className="h-4 w-4 text-green-600 mb-1" />
                            <span className="text-lg font-bold text-green-600">{masteredCount}</span>
                            <span className="text-xs text-muted-foreground">Mastered</span>
                        </div>

                        {/* In Progress */}
                        <div className="flex flex-col items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <TrendingUp className="h-4 w-4 text-blue-600 mb-1" />
                            <span className="text-lg font-bold text-blue-600">{inProgressCount}</span>
                            <span className="text-xs text-muted-foreground">Learning</span>
                        </div>

                        {/* Struggling */}
                        <div className="flex flex-col items-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <AlertCircle className="h-4 w-4 text-red-600 mb-1" />
                            <span className="text-lg font-bold text-red-600">{strugglingCount}</span>
                            <span className="text-xs text-muted-foreground">Struggling</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
