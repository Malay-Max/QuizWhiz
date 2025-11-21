/**
 * Storage functions for SRS (Spaced Repetition System) and Analytics
 * Handles Firestore operations for question performance tracking, 
 * review scheduling, and analytics data
 */

import type {
    QuestionPerformance,
    Question,
    CategoryAnalytics,
    WeakSpot,
    ReviewSession,
    StorableReviewSession
} from '@/types';
import { db, auth } from './firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { initializeQuestionPerformance } from './srs-algorithm';
import { buildCategoryAnalytics, identifyWeakSpots } from './analytics';

const QUESTION_PERFORMANCE_COLLECTION = 'questionPerformance';
const REVIEW_SESSIONS_COLLECTION = 'reviewSessions';
const CATEGORY_ANALYTICS_COLLECTION = 'categoryAnalytics';
const ACTIVE_REVIEW_SESSION_ID_KEY = 'quizcraft_active_review_session_id';

function handleFirestoreError(error: unknown, defaultMessage: string): string {
    if (error instanceof FirebaseError) {
        if (error.code === 'permission-denied') {
            return 'Permission denied. You do not have the necessary rights to perform this action.';
        }
        return `Firestore error: ${error.message} (Code: ${error.code})`;
    }
    return defaultMessage;
}

// --- Question Performance Functions ---

/**
 * Get question performance data for a specific question and user
 */
export async function getQuestionPerformance(
    questionId: string,
    userId: string
): Promise<QuestionPerformance | null> {
    try {
        const perfId = `${questionId}-${userId}`;
        const docRef = doc(db, QUESTION_PERFORMANCE_COLLECTION, perfId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as QuestionPerformance;
        }
        return null;
    } catch (error) {
        console.error('Error fetching question performance:', error);
        return null;
    }
}

/**
 * Update or create question performance data
 */
export async function updateQuestionPerformance(
    performance: QuestionPerformance
): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = doc(db, QUESTION_PERFORMANCE_COLLECTION, performance.id);
        await setDoc(docRef, performance);
        return { success: true };
    } catch (error) {
        console.error('Error updating question performance:', error);
        return { success: false, error: handleFirestoreError(error, 'Failed to update question performance.') };
    }
}

/**
 * Initialize performance tracking for a new question
 */
export async function ensureQuestionPerformance(
    questionId: string,
    userId: string,
    categoryId: string
): Promise<QuestionPerformance> {
    const existing = await getQuestionPerformance(questionId, userId);

    if (existing) {
        return existing;
    }

    // Create new performance record
    const newPerformance = initializeQuestionPerformance(questionId, userId, categoryId);
    await updateQuestionPerformance(newPerformance);
    return newPerformance;
}

/**
 * Get all question performances for a user in a specific category
 */
export async function getQuestionPerformancesByCategory(
    userId: string,
    categoryId: string
): Promise<QuestionPerformance[]> {
    try {
        const q = query(
            collection(db, QUESTION_PERFORMANCE_COLLECTION),
            where('userId', '==', userId),
            where('categoryId', '==', categoryId)
        );

        const querySnapshot = await getDocs(q);
        const performances: QuestionPerformance[] = [];

        querySnapshot.forEach((docSnap) => {
            performances.push(docSnap.data() as QuestionPerformance);
        });

        return performances;
    } catch (error) {
        console.error('Error fetching category performances:', error);
        return [];
    }
}

/**
 * Get all question performances for a user
 */
export async function getAllQuestionPerformances(
    userId: string
): Promise<QuestionPerformance[]> {
    try {
        const q = query(
            collection(db, QUESTION_PERFORMANCE_COLLECTION),
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const performances: QuestionPerformance[] = [];

        querySnapshot.forEach((docSnap) => {
            performances.push(docSnap.data() as QuestionPerformance);
        });

        return performances;
    } catch (error) {
        console.error('Error fetching all performances:', error);
        return [];
    }
}

// --- Review Scheduling Functions ---

/**
 * Get questions that are due for review
 */
export async function getDueReviewQuestions(
    userId: string,
    maxQuestions: number = 20
): Promise<Question[]> {
    try {
        const now = Timestamp.now();

        // Query for due questions
        const q = query(
            collection(db, QUESTION_PERFORMANCE_COLLECTION),
            where('userId', '==', userId),
            where('nextReviewDate', '<=', now),
            orderBy('nextReviewDate', 'asc'),
            limit(maxQuestions)
        );

        const querySnapshot = await getDocs(q);
        const performances: QuestionPerformance[] = [];

        querySnapshot.forEach((docSnap) => {
            performances.push(docSnap.data() as QuestionPerformance);
        });

        // Fetch the actual question data
        const { getQuestionById } = await import('./storage');
        const questions: Question[] = [];

        for (const perf of performances) {
            const question = await getQuestionById(perf.questionId);
            if (question) {
                questions.push(question);
            }
        }

        return questions;
    } catch (error) {
        console.error('Error fetching due review questions:', error);
        return [];
    }
}

/**
 * Get count of questions due for review
 */
export async function getReviewQueueCount(userId: string): Promise<number> {
    try {
        const now = Timestamp.now();

        const q = query(
            collection(db, QUESTION_PERFORMANCE_COLLECTION),
            where('userId', '==', userId),
            where('nextReviewDate', '<=', now)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error('Error getting review queue count:', error);
        return 0;
    }
}

// --- Review Session Functions ---

/**
 * Start a new review session
 */
export async function startReviewSession(
    userId: string,
    questions: Question[]
): Promise<{ success: boolean; session?: ReviewSession; error?: string }> {
    try {
        const sessionId = crypto.randomUUID();
        const session: ReviewSession = {
            id: sessionId,
            userId,
            questions,
            currentQuestionIndex: 0,
            answers: [],
            startTime: Date.now(),
            status: 'active',
        };

        const { startTime: _startTime, endTime: _endTime, ...rest } = session;
        const storableSession: StorableReviewSession = {
            ...rest,
            startTime: Timestamp.fromMillis(session.startTime),
        };

        const docRef = doc(db, REVIEW_SESSIONS_COLLECTION, sessionId);
        await setDoc(docRef, storableSession);

        // Save to local storage
        if (typeof window !== 'undefined') {
            localStorage.setItem(ACTIVE_REVIEW_SESSION_ID_KEY, sessionId);
        }

        return { success: true, session };
    } catch (error) {
        console.error('Error starting review session:', error);
        return { success: false, error: handleFirestoreError(error, 'Failed to start review session.') };
    }
}

/**
 * Get review session by ID
 */
export async function getReviewSessionById(sessionId: string): Promise<ReviewSession | null> {
    try {
        const docRef = doc(db, REVIEW_SESSIONS_COLLECTION, sessionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as StorableReviewSession;
            return {
                ...data,
                startTime: data.startTime.toMillis(),
                endTime: data.endTime ? data.endTime.toMillis() : undefined,
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching review session by ID:', error);
        return null;
    }
}

/**
 * Get active review session
 */
export async function getActiveReviewSession(): Promise<ReviewSession | null> {
    if (typeof window === 'undefined') return null;

    const sessionId = localStorage.getItem(ACTIVE_REVIEW_SESSION_ID_KEY);
    if (!sessionId) return null;

    const session = await getReviewSessionById(sessionId);
    if (!session) {
        localStorage.removeItem(ACTIVE_REVIEW_SESSION_ID_KEY);
    }
    return session;
}

/**
 * Update review session
 */
export async function updateReviewSession(
    session: ReviewSession
): Promise<{ success: boolean; error?: string }> {
    try {
        const { startTime: _startTime, endTime: _endTime, ...rest } = session;
        const storableSession: StorableReviewSession = {
            ...rest,
            startTime: Timestamp.fromMillis(session.startTime),
            ...(session.endTime && { endTime: Timestamp.fromMillis(session.endTime) }),
        };

        const docRef = doc(db, REVIEW_SESSIONS_COLLECTION, session.id);
        await setDoc(docRef, storableSession);
        return { success: true };
    } catch (error) {
        console.error('Error updating review session:', error);
        return { success: false, error: handleFirestoreError(error, 'Failed to update review session.') };
    }
}

/**
 * Clear active review session
 */
export function clearActiveReviewSession(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_REVIEW_SESSION_ID_KEY);
    }
}

// --- Analytics Functions ---

/**
 * Get or create category analytics
 */
export async function getCategoryAnalytics(
    categoryId: string,
    userId: string
): Promise<CategoryAnalytics | null> {
    try {
        const analyticsId = `${categoryId}-${userId}`;
        const docRef = doc(db, CATEGORY_ANALYTICS_COLLECTION, analyticsId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as CategoryAnalytics;
        }
        return null;
    } catch (error) {
        console.error('Error fetching category analytics:', error);
        return null;
    }
}

/**
 * Update category analytics
 */
export async function updateCategoryAnalytics(
    categoryId: string,
    userId: string,
    allPerformances: QuestionPerformance[],
    totalQuestions: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const analytics = buildCategoryAnalytics(categoryId, userId, allPerformances, totalQuestions);
        const docRef = doc(db, CATEGORY_ANALYTICS_COLLECTION, analytics.id);
        await setDoc(docRef, analytics);
        return { success: true };
    } catch (error) {
        console.error('Error updating category analytics:', error);
        return { success: false, error: handleFirestoreError(error, 'Failed to update analytics.') };
    }
}

/**
 * Get all category analytics for a user
 */
export async function getAllCategoryAnalytics(
    userId: string
): Promise<CategoryAnalytics[]> {
    try {
        const q = query(
            collection(db, CATEGORY_ANALYTICS_COLLECTION),
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const analytics: CategoryAnalytics[] = [];

        querySnapshot.forEach((docSnap) => {
            analytics.push(docSnap.data() as CategoryAnalytics);
        });

        return analytics;
    } catch (error) {
        console.error('Error fetching all analytics:', error);
        return [];
    }
}

/**
 * Get weak spots for a user
 */
export async function getWeakSpotsForUser(
    userId: string,
    maxSpots: number = 5
): Promise<WeakSpot[]> {
    try {
        // Get all performances
        const allPerformances = await getAllQuestionPerformances(userId);

        // Get all questions
        const { getQuestions } = await import('./storage');
        const allQuestions = await getQuestions();

        // Get all categories
        const { getAllCategories } = await import('./storage');
        const allCategories = await getAllCategories();

        // Build maps
        const questionsMap = new Map<string, Question>(
            allQuestions.map(q => [q.id, q])
        );

        const categoriesMap = new Map<string, string>(
            allCategories.map(c => [c.id, c.name])
        );

        // Identify weak spots
        const weakSpots = identifyWeakSpots(
            allPerformances,
            questionsMap,
            categoriesMap,
            maxSpots
        );

        return weakSpots;
    } catch (error) {
        console.error('Error fetching weak spots:', error);
        return [];
    }
}

/**
 * Create a quiz from weak spot questions
 */
export async function createWeakSpotQuiz(
    userId: string,
    questionCount: number = 10
): Promise<Question[]> {
    const weakSpots = await getWeakSpotsForUser(userId, questionCount);
    return weakSpots.map(ws => ws.question);
}

/**
 * Get count of questions due for review
 */
export async function getDueReviewsCount(userId: string): Promise<number> {
    try {
        const performanceRef = collection(db, QUESTION_PERFORMANCE_COLLECTION);
        const q = query(
            performanceRef,
            where('userId', '==', userId),
            where('nextReviewDate', '<=', Timestamp.now())
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error('Error getting due reviews count:', error);
        return 0;
    }
}
