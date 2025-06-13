
"use client";

import type { Question, QuizSession, CategoryTreeNode, AnswerOption } from '@/types';
import { db } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, runTransaction, Timestamp
} from 'firebase/firestore';

const QUESTIONS_COLLECTION = 'questions';
const QUIZ_SESSIONS_COLLECTION = 'quizSessions';
const ACTIVE_QUIZ_SESSION_ID_KEY = 'quizcraft_active_session_id'; // Used for localStorage

// --- Question Functions ---
export async function getQuestions(): Promise<Question[]> {
  if (typeof window === 'undefined') return [];
  try {
    const querySnapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
    const questions: Question[] = [];
    querySnapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() } as Question);
    });
    return questions;
  } catch (error) {
    console.error("Error fetching questions from Firestore:", error);
    return [];
  }
}

export async function addQuestion(question: Omit<Question, 'id'> & { id?: string }): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const newQuestionRef = doc(collection(db, QUESTIONS_COLLECTION), question.id || crypto.randomUUID());
    const questionData: Question = {
      id: newQuestionRef.id,
      text: question.text,
      options: question.options,
      correctAnswerId: question.correctAnswerId,
      category: question.category,
    };
    await setDoc(newQuestionRef, questionData);
    return newQuestionRef.id;
  } catch (error) {
    console.error("Error adding question to Firestore:", error);
    return null;
  }
}

export async function getQuestionById(id: string): Promise<Question | undefined> {
  if (typeof window === 'undefined') return undefined;
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Question;
    } else {
      console.log("No such question document!");
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching question by ID from Firestore:", error);
    return undefined;
  }
}

export async function updateQuestion(updatedQuestion: Question): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, updatedQuestion.id);
    // Ensure we don't write the id field inside the document itself if it's already the doc ID
    const { id, ...dataToUpdate } = updatedQuestion;
    await setDoc(questionRef, dataToUpdate, { merge: true });
  } catch (error) {
    console.error("Error updating question in Firestore:", error);
  }
}

export async function deleteQuestionById(questionId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, questionId));
  } catch (error) {
    console.error("Error deleting question from Firestore:", error);
  }
}

export async function deleteQuestionsByCategory(categoryPath: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    // Firestore doesn't directly support 'startsWith' for string fields in queries for deletions.
    // A common pattern is to fetch all questions, filter client-side, then delete.
    // For very large datasets, this is inefficient. A more robust solution might involve
    // structuring categories differently (e.g., array of path segments) or using Cloud Functions.
    // For now, we'll fetch and delete, which matches previous localStorage logic.
    
    // Create a query that finds questions where the category starts with categoryPath
    const q = query(collection(db, QUESTIONS_COLLECTION), 
                    where("category", ">=", categoryPath),
                    where("category", "<=", categoryPath + '\uf8ff'));
    
    const querySnapshot = await getDocs(q);
    const questionsToDelete: Question[] = [];
    querySnapshot.forEach((docSnap) => {
        // Additional client-side check to ensure it's a true prefix match,
        // as Firestore's range query for strings can sometimes include unintended matches
        // if not careful with the end range character.
        const data = docSnap.data() as Question;
        if (typeof data.category === 'string' && data.category.startsWith(categoryPath)) {
            questionsToDelete.push({ id: docSnap.id, ...data });
        }
    });


    // Use a transaction or batched write for deleting multiple documents
    // Batched write is simpler here if we don't need to read during the transaction
    if (questionsToDelete.length > 0) {
        const { writeBatch } = await import('firebase/firestore'); // Dynamically import if not already top-level
        const batch = writeBatch(db);
        questionsToDelete.forEach(questionDoc => {
            const docRef = doc(db, QUESTIONS_COLLECTION, questionDoc.id);
            batch.delete(docRef);
        });
        await batch.commit();
        console.log(`Deleted ${questionsToDelete.length} questions from category ${categoryPath} and its sub-categories.`);
    } else {
        console.log(`No questions found for deletion in category ${categoryPath} and its sub-categories.`);
    }

  } catch (error) {
    console.error("Error deleting questions by category from Firestore:", error);
  }
}

export async function getCategories(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  const questions = await getQuestions();
  const allCategories = questions.map(q => q.category);
  // Filter out empty or non-string categories and sort
  return [...new Set(allCategories)].filter(c => c && typeof c === 'string' && c.trim() !== "").sort();
}

// --- Quiz Session Functions ---
// Note: Timestamps are now handled more explicitly for Firestore
interface StorableQuizSession extends Omit<QuizSession, 'startTime' | 'endTime'> {
  startTime: Timestamp | number; // Allow number for initial save, convert to Timestamp
  endTime?: Timestamp | number;
}


export async function saveQuizSession(session: QuizSession): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const sessionRef = doc(db, QUIZ_SESSIONS_COLLECTION, session.id);
    
    const sessionToStore: StorableQuizSession = {
      ...session,
      startTime: typeof session.startTime === 'number' ? Timestamp.fromMillis(session.startTime) : session.startTime,
      endTime: session.endTime ? (typeof session.endTime === 'number' ? Timestamp.fromMillis(session.endTime) : session.endTime) : undefined,
    };
    
    await setDoc(sessionRef, sessionToStore);
    localStorage.setItem(ACTIVE_QUIZ_SESSION_ID_KEY, session.id);
  } catch (error) {
    console.error("Error saving quiz session to Firestore:", error);
  }
}

export async function getQuizSession(): Promise<QuizSession | null> {
  if (typeof window === 'undefined') return null;
  const activeSessionId = localStorage.getItem(ACTIVE_QUIZ_SESSION_ID_KEY);
  if (!activeSessionId) return null;

  try {
    const docRef = doc(db, QUIZ_SESSIONS_COLLECTION, activeSessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as StorableQuizSession;
      // Convert Firestore Timestamps back to numbers (milliseconds)
      return {
        ...data,
        id: docSnap.id,
        startTime: (data.startTime as Timestamp).toMillis(),
        endTime: data.endTime ? (data.endTime as Timestamp).toMillis() : undefined,
      } as QuizSession;
    } else {
      console.log("No such active session document!");
      localStorage.removeItem(ACTIVE_QUIZ_SESSION_ID_KEY); // Clean up stale ID
      return null;
    }
  } catch (error) {
    console.error("Error fetching active quiz session from Firestore:", error);
    return null;
  }
}

export function clearQuizSession(): void {
  if (typeof window === 'undefined') return;
  const activeSessionId = localStorage.getItem(ACTIVE_QUIZ_SESSION_ID_KEY);
  if (activeSessionId) {
    // Optionally, delete the session document from Firestore if desired
    // For now, just clearing the local reference is enough to "clear" the active session for the user
    // deleteDoc(doc(db, QUIZ_SESSIONS_COLLECTION, activeSessionId)).catch(err => console.error("Error deleting session from Firestore:", err));
  }
  localStorage.removeItem(ACTIVE_QUIZ_SESSION_ID_KEY);
}


// --- Category Tree Function (remains synchronous, operates on fetched data) ---
export function buildCategoryTree(uniquePaths: string[]): CategoryTreeNode[] {
  const treeRoot: { children: CategoryTreeNode[] } = { children: [] };
  const nodeMap: Record<string, CategoryTreeNode> = {};

  const sortedPaths = [...new Set(uniquePaths)].sort();

  for (const path of sortedPaths) {
    const parts = path.split('/');
    let currentParentChildrenList = treeRoot.children;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const partName = parts[i];
      currentPath = currentPath ? `${currentPath}/${partName}` : partName;

      let node = nodeMap[currentPath];
      if (!node) {
        node = {
          name: partName,
          path: currentPath,
          children: [],
        };
        nodeMap[currentPath] = node;
        
        // Add to correct parent's children list
        if (i === 0) { // Top-level node
            if (!treeRoot.children.some(child => child.path === node.path)) {
                 treeRoot.children.push(node);
            }
        } else {
            const parentPath = parts.slice(0, i).join('/');
            const parentNode = nodeMap[parentPath];
            if (parentNode && !parentNode.children.some(child => child.path === node.path)) {
                parentNode.children.push(node);
            }
        }
      }
      currentParentChildrenList = node.children;
    }
  }
  return treeRoot.children;
}

