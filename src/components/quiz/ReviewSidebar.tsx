"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Flame, TrendingUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDueReviewsCount } from '@/lib/srs-storage';

export function ReviewSidebar() {
    const router = useRouter();
    const { currentUser } = useAuth();
    const [dueCount, setDueCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadReviewData = async () => {
            if (!currentUser) {
                setIsLoading(false);
                return;
            }

            try {
                const count = await getDueReviewsCount(currentUser.uid);
                setDueCount(count);
            } catch (error) {
                console.error('Error loading review data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadReviewData();
    }, [currentUser]);

    if (!currentUser) {
        return (
            <aside className="hidden lg:block w-64 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Reviews
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground text-center py-4">
                            Log in to start reviewing
                        </p>
                    </CardContent>
                </Card>
            </aside>
        );
    }

    return (
        <aside className="hidden lg:block w-64 space-y-4">
            {/* Reviews Due Card */}
            <Card className="border-purple-500/50 bg-purple-950/20">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-500" />
                        Reviews Due
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center space-y-2">
                        <div className="text-4xl font-bold text-purple-500">
                            {isLoading ? '...' : dueCount}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            questions ready to review
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Study Streak Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        Study Streak
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center space-y-2">
                        <div className="text-3xl font-bold text-orange-500">
                            0 days
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Keep it going!
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Learning Progress Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Learning Progress
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Mastered</span>
                        <Badge variant="secondary" className="bg-green-950/40 text-green-400 border-green-800/50">
                            0
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Learning</span>
                        <Badge variant="secondary" className="bg-blue-950/40 text-blue-400 border-blue-800/50">
                            0
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">New</span>
                        <Badge variant="secondary">0</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Start Review Button */}
            <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => router.push('/review')}
                disabled={dueCount === 0}
            >
                Start Review
                <ArrowRight className="h-3 w-3 ml-2" />
            </Button>
        </aside>
    );
}
