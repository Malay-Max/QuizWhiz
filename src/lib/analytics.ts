/**
 * Analytics utilities for QuizWhiz
 * Provides functions for calculating mastery, identifying weak spots,
 * and aggregating performance statistics
 */

import type {
    QuestionPerformance,
    CategoryAnalytics,
    WeakSpot,
    Question,
    StorableQuestionPerformance,
    StorableCategoryAnalytics
} from '@/types';
import { Timestamp } from 'firebase/firestore';
import { calculateAccuracy, isQuestionMastered, isWeakSpot } from './srs-algorithm';

/**
 * Calculate overall mastery percentage for a category
 * Formula: (masteredQuestions / totalQuestions) * 100
 * 
 * @param performances All question performances for questions in this category
 * @param totalQuestionsInCategory Total number of questions in the category
 * @returns Mastery percentage (0-100)
 */
export function calculateCategoryMastery(
    performances: QuestionPerformance[],
    totalQuestionsInCategory: number
): number {
    if (totalQuestionsInCategory === 0) return 0;

    const masteredCount = performances.filter(isQuestionMastered).length;
    return Math.round((masteredCount / totalQuestionsInCategory) * 100);
}

/**
 * Build CategoryAnalytics from question performances
 * 
 * @param categoryId Category to analyze
 * @param userId User to analyze for
 * @param performances All performances for questions in this category
 * @param totalQuestions Total questions in category
 * @returns CategoryAnalytics object
 */
export function buildCategoryAnalytics(
    categoryId: string,
    userId: string,
    performances: QuestionPerformance[],
    totalQuestions: number
): CategoryAnalytics {
    const masteredQuestions = performances.filter(isQuestionMastered).length;
    const strugglingQuestions = performances.filter(isWeakSpot).length;

    // Calculate average accuracy across all attempted questions
    const attemptedPerformances = performances.filter(p => p.totalAttempts > 0);
    const avgAccuracy = attemptedPerformances.length > 0
        ? attemptedPerformances.reduce((sum, p) => sum + calculateAccuracy(p), 0) / attemptedPerformances.length
        : 0;

    return {
        id: `${categoryId}-${userId}`,
        categoryId,
        userId,
        totalQuestions,
        masteredQuestions,
        strugglingQuestions,
        averageAccuracy: Math.round(avgAccuracy * 10) / 10, // Round to 1 decimal
        lastUpdated: Timestamp.now(),
    };
}

/**
 * Identify weak spots from all question performances
 * Weak spots are questions with <50% accuracy and at least 2 attempts
 * 
 * @param allPerformances All question performances for a user
 * @param questionsMap Map of questionId to Question object
 * @param categoryMap Map of categoryId to category name
 * @param limit Maximum number of weak spots to return
 * @returns Array of WeakSpot objects, sorted by lowest accuracy first
 */
export function identifyWeakSpots(
    allPerformances: QuestionPerformance[],
    questionsMap: Map<string, Question>,
    categoryMap: Map<string, string>,
    limit: number = 5
): WeakSpot[] {
    const weakSpotPerformances = allPerformances.filter(isWeakSpot);

    // Map to WeakSpot objects and sort by accuracy (lowest first)
    const weakSpots: WeakSpot[] = weakSpotPerformances
        .map(perf => {
            const question = questionsMap.get(perf.questionId);
            if (!question) return null;

            return {
                questionId: perf.questionId,
                question,
                accuracy: calculateAccuracy(perf),
                attempts: perf.totalAttempts,
                lastAttempted: perf.lastReviewedAt,
                categoryName: categoryMap.get(perf.categoryId) || 'Unknown Category',
            };
        })
        .filter((ws): ws is WeakSpot => ws !== null)
        .sort((a, b) => a.accuracy - b.accuracy);

    return weakSpots.slice(0, limit);
}

/**
 * Convert StorableQuestionPerformance (Firestore) to QuestionPerformance (client)
 */
export function storableToQuestionPerformance(
    storable: StorableQuestionPerformance & { nextReviewDate: Timestamp; lastReviewedAt: Timestamp }
): QuestionPerformance {
    return {
        ...storable,
        nextReviewDate: storable.nextReviewDate,
        lastReviewedAt: storable.lastReviewedAt,
    };
}

/**
 * Convert QuestionPerformance (client) to StorableQuestionPerformance (Firestore)
 */
export function questionPerformanceToStorable(
    performance: QuestionPerformance
): Omit<QuestionPerformance, never> {
    // QuestionPerformance already has Timestamp types, so just return as-is
    return performance;
}

/**
 * Convert StorableCategoryAnalytics (Firestore) to CategoryAnalytics (client)
 */
export function storableToCategoryAnalytics(
    storable: StorableCategoryAnalytics & { lastUpdated: Timestamp }
): CategoryAnalytics {
    return {
        ...storable,
        lastUpdated: storable.lastUpdated,
    };
}

/**
 * Convert CategoryAnalytics (client) to StorableCategoryAnalytics (Firestore)
 */
export function categoryAnalyticsToStorable(
    analytics: CategoryAnalytics
): Omit<CategoryAnalytics, never> {
    // CategoryAnalytics already has Timestamp types, so just return as-is
    return analytics;
}

/**
 * Calculate overall statistics across all categories
 * 
 * @param allAnalytics All category analytics for a user
 * @returns Aggregated stats
 */
export function calculateOverallStats(
    allAnalytics: CategoryAnalytics[]
): {
    totalQuestions: number;
    totalMastered: number;
    totalStruggling: number;
    overallAccuracy: number;
    masteryPercentage: number;
} {
    const totals = allAnalytics.reduce(
        (acc, analytics) => ({
            totalQuestions: acc.totalQuestions + analytics.totalQuestions,
            totalMastered: acc.totalMastered + analytics.masteredQuestions,
            totalStruggling: acc.totalStruggling + analytics.strugglingQuestions,
            accuracySum: acc.accuracySum + (analytics.averageAccuracy * analytics.totalQuestions),
        }),
        { totalQuestions: 0, totalMastered: 0, totalStruggling: 0, accuracySum: 0 }
    );

    const overallAccuracy = totals.totalQuestions > 0
        ? totals.accuracySum / totals.totalQuestions
        : 0;

    const masteryPercentage = totals.totalQuestions > 0
        ? (totals.totalMastered / totals.totalQuestions) * 100
        : 0;

    return {
        ...totals,
        overallAccuracy: Math.round(overallAccuracy * 10) / 10,
        masteryPercentage: Math.round(masteryPercentage),
    };
}
