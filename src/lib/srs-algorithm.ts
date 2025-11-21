/**
 * Spaced Repetition System (SRS) Algorithm Implementation
 * Based on the SM-2 algorithm (SuperMemo 2) with modifications for QuizWhiz
 * 
 * The SM-2 algorithm schedules reviews based on:
 * - Ease Factor (EF): How "easy" the question is (2.5 default, min 1.3)
 * - Interval: Days until next review
 * - Repetitions: Consecutive correct answers
 * 
 * Quality ratings (0-5):
 * - 0: Complete blackout
 * - 1: Incorrect, but recognized
 * - 2: Incorrect, but almost got it
 * - 3: Correct with difficulty
 * - 4: Correct with hesitation
 * - 5: Perfect recall
 */

import type { QuestionPerformance } from '@/types';
import { ConfidenceLevel } from '@/types';
import { Timestamp } from 'firebase/firestore';

// SM-2 Algorithm Constants
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MASTERY_THRESHOLD = 3; // Consecutive correct answers for "mastery"

// Short-term intervals for incorrect answers (in milliseconds)
const SHORT_INTERVALS = {
    FIRST_FAIL: 60 * 1000,        // 1 minute
    SECOND_FAIL: 60 * 60 * 1000,  // 1 hour
    THIRD_FAIL: 24 * 60 * 60 * 1000, // 1 day
};

/**
 * Initialize a new QuestionPerformance record for a user
 */
export function initializeQuestionPerformance(
    questionId: string,
    userId: string,
    categoryId: string
): QuestionPerformance {
    const now = Timestamp.now();

    return {
        id: `${questionId}-${userId}`,
        questionId,
        userId,
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        nextReviewDate: now,
        lastReviewedAt: now,
        totalAttempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        confidenceHistory: [],
        categoryId,
    };
}

/**
 * Convert user's answer correctness and confidence to SM-2 quality score (0-5)
 * 
 * @param isCorrect Whether the answer was correct
 * @param confidence User's confidence level (1-4)
 * @returns Quality score for SM-2 algorithm (0-5)
 */
export function confidenceToQuality(
    isCorrect: boolean,
    confidence: ConfidenceLevel
): number {
    if (!isCorrect) {
        // Incorrect answers: 0-2 based on confidence
        // Higher confidence when wrong = lower quality (more embarrassing mistake)
        switch (confidence) {
            case ConfidenceLevel.KNEW_IT:
            case ConfidenceLevel.SURE:
                return 0; // Very wrong if you were confident
            case ConfidenceLevel.UNSURE:
                return 1; // Less bad if you were unsure
            case ConfidenceLevel.GUESS:
                return 2; // Best incorrect scenario - you knew you didn't know
            default:
                return 1;
        }
    } else {
        // Correct answers: 3-5 based on confidence
        switch (confidence) {
            case ConfidenceLevel.KNEW_IT:
                return 5; // Perfect recall
            case ConfidenceLevel.SURE:
                return 4; // Good recall with slight hesitation
            case ConfidenceLevel.UNSURE:
                return 3; // Correct but struggled
            case ConfidenceLevel.GUESS:
                return 3; // Lucky guess - treat same as struggled
            default:
                return 4;
        }
    }
}

/**
 * Get short-term interval for recently failed questions
 * 
 * @param failCount Number of consecutive failures (0-based)
 * @returns Interval in milliseconds
 */
export function getShortTermInterval(failCount: number): number {
    switch (failCount) {
        case 0:
            return SHORT_INTERVALS.FIRST_FAIL; // 1 minute
        case 1:
            return SHORT_INTERVALS.SECOND_FAIL; // 1 hour
        case 2:
        default:
            return SHORT_INTERVALS.THIRD_FAIL; // 1 day
    }
}

/**
 * Calculate the next review date and update performance metrics
 * This is the core SM-2 algorithm implementation
 * 
 * @param performance Current question performance data
 * @param isCorrect Whether the user answered correctly
 * @param confidence User's confidence level
 * @returns Updated performance metrics
 */
export function calculateNextReview(
    performance: QuestionPerformance,
    isCorrect: boolean,
    confidence: ConfidenceLevel = ConfidenceLevel.SURE
): QuestionPerformance {
    const quality = confidenceToQuality(isCorrect, confidence);
    const now = Timestamp.now();

    // Update confidence history (keep last 5)
    const newConfidenceHistory = [...performance.confidenceHistory, confidence];
    if (newConfidenceHistory.length > 5) {
        newConfidenceHistory.shift();
    }

    // Update attempt counters
    const totalAttempts = performance.totalAttempts + 1;
    const correctAttempts = performance.correctAttempts + (isCorrect ? 1 : 0);
    const incorrectAttempts = performance.incorrectAttempts + (isCorrect ? 0 : 1);

    let newEaseFactor: number;
    let newInterval: number;
    let newRepetitions: number;
    let nextReviewDate: Timestamp;

    if (quality < 3) {
        // Incorrect answer - reset repetitions and use short intervals
        newRepetitions = 0;
        newEaseFactor = performance.easeFactor; // Don't change EF on failure

        // Use escalating short-term intervals
        const failStreak = performance.repetitions === 0
            ? Math.min(incorrectAttempts - 1, 2) // Count consecutive fails
            : 0; // Reset if had some correct answers

        const intervalMs = getShortTermInterval(failStreak);
        nextReviewDate = Timestamp.fromMillis(now.toMillis() + intervalMs);
        newInterval = intervalMs / (1000 * 60 * 60 * 24); // Convert to days for tracking

    } else {
        // Correct answer - apply SM-2 algorithm
        newRepetitions = performance.repetitions + 1;

        // Update ease factor based on quality
        // EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        const efModifier = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        newEaseFactor = Math.max(
            MIN_EASE_FACTOR,
            performance.easeFactor + efModifier
        );

        // Calculate interval
        if (newRepetitions === 1) {
            newInterval = 1; // 1 day
        } else if (newRepetitions === 2) {
            newInterval = 6; // 6 days
        } else {
            // I(n) = I(n-1) * EF
            newInterval = Math.round(performance.interval * newEaseFactor);
        }

        // Calculate next review date
        const intervalMs = newInterval * 24 * 60 * 60 * 1000; // Convert days to ms
        nextReviewDate = Timestamp.fromMillis(now.toMillis() + intervalMs);
    }

    return {
        ...performance,
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        nextReviewDate,
        lastReviewedAt: now,
        totalAttempts,
        correctAttempts,
        incorrectAttempts,
        confidenceHistory: newConfidenceHistory,
    };
}

/**
 * Check if a question is "due" for review
 */
export function isQuestionDue(performance: QuestionPerformance): boolean {
    const now = Date.now();
    const dueTime = performance.nextReviewDate.toMillis();
    return dueTime <= now;
}

/**
 * Check if a question is considered "mastered"
 * A question is mastered if it has been answered correctly 3+ times consecutively
 */
export function isQuestionMastered(performance: QuestionPerformance): boolean {
    return performance.repetitions >= MASTERY_THRESHOLD;
}

/**
 * Calculate accuracy percentage for a question
 */
export function calculateAccuracy(performance: QuestionPerformance): number {
    if (performance.totalAttempts === 0) return 0;
    return (performance.correctAttempts / performance.totalAttempts) * 100;
}

/**
 * Check if a question is a "weak spot" (struggling)
 * A question is struggling if accuracy is less than 50%
 */
export function isWeakSpot(performance: QuestionPerformance): boolean {
    return calculateAccuracy(performance) < 50 && performance.totalAttempts >= 2;
}
