
"use client";

import type { Question, QuizSession, CategoryTreeNode, StorableQuizSession } from '@/types'; // Added StorableQuizSession
import { db, auth } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, Timestamp 
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

const QUESTIONS_COLLECTION = 'questions';
const QUIZ_SESSIONS_COLLECTION = 'quizSessions';
const ACTIVE_QUIZ_SESSION_ID_KEY = 'quizcraft_active_session_id';

// Helper function to handle Firestore errors
function handleFirestoreError(error: unknown, defaultMessage: string): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'Permission denied. You do not have the necessary rights to perform this action.';
    }
    return `Firestore error: ${error.message} (Code: ${error.code})`;
  }
  return defaultMessage;
}

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

export async function addQuestion(question: Omit<Question, 'id'> & { id?: string }): Promise<{ success: boolean; id?: string; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
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
    return { success: true, id: newQuestionRef.id };
  } catch (error) {
    console.error("Error adding question to Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not add question.") };
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

export async function updateQuestion(updatedQuestion: Question): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, updatedQuestion.id);
    const { id, ...dataToUpdate } = updatedQuestion;
    await setDoc(questionRef, dataToUpdate, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating question in Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not update question.") };
  }
}

export async function deleteQuestionById(questionId: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, questionId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting question from Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not delete question.") };
  }
}

export async function deleteQuestionsByCategory(categoryPath: string): Promise<{ success: boolean; count?: number; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const q = query(collection(db, QUESTIONS_COLLECTION), 
                    where("category", ">=", categoryPath),
                    where("category", "<=", categoryPath + '\uf8ff'));
    
    const querySnapshot = await getDocs(q);
    const questionsToDeleteIds: string[] = [];
    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Question;
        if (typeof data.category === 'string' && data.category.startsWith(categoryPath)) {
            questionsToDeleteIds.push(docSnap.id);
        }
    });

    if (questionsToDeleteIds.length > 0) {
        const batch = writeBatch(db);
        questionsToDeleteIds.forEach(id => {
            batch.delete(doc(db, QUESTIONS_COLLECTION, id));
        });
        await batch.commit();
        console.log(`Deleted ${questionsToDeleteIds.length} questions from category ${categoryPath} and its sub-categories.`);
        return { success: true, count: questionsToDeleteIds.length };
    } else {
        console.log(`No questions found for deletion in category ${categoryPath} and its sub-categories.`);
        return { success: true, count: 0 };
    }
  } catch (error) {
    console.error("Error deleting questions by category from Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not delete questions by category.") };
  }
}

export async function getCategories(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  const questions = await getQuestions();
  const allCategories = questions.map(q => q.category);
  return [...new Set(allCategories)].filter(c => c && typeof c === 'string' && c.trim() !== "").sort();
}

// --- Quiz Session Functions ---
export async function saveQuizSession(session: QuizSession): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const sessionRef = doc(db, QUIZ_SESSIONS_COLLECTION, session.id);
    const user = auth.currentUser;

    // Start with a base object containing non-optional fields that are always present
    const dataToStore: Partial<StorableQuizSession> = {
      id: session.id,
      category: session.category,
      questions: session.questions,
      currentQuestionIndex: session.currentQuestionIndex,
      answers: session.answers,
      status: session.status,
      startTime: typeof session.startTime === 'number' ? Timestamp.fromMillis(session.startTime) : session.startTime,
    };

    // Conditionally add endTime only if it has a value
    if (session.endTime) {
      dataToStore.endTime = typeof session.endTime === 'number' ? Timestamp.fromMillis(session.endTime) : session.endTime;
    }

    // Conditionally add userId only if a user is authenticated
    if (user && user.uid) {
      dataToStore.userId = user.uid;
    }
    
    // Pass the constructed object to setDoc. Firestore will only write fields that are present.
    await setDoc(sessionRef, dataToStore);
    localStorage.setItem(ACTIVE_QUIZ_SESSION_ID_KEY, session.id);
    return { success: true };
  } catch (error) {
    console.error("Error saving quiz session to Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not save quiz session.") };
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
      const data = docSnap.data() as StorableQuizSession; // Cast to StorableQuizSession
      const quizSession: QuizSession = {
        id: docSnap.id,
        category: data.category,
        questions: data.questions,
        currentQuestionIndex: data.currentQuestionIndex,
        answers: data.answers,
        startTime: (data.startTime as Timestamp).toMillis(), // Ensure conversion if startTime is Timestamp
        endTime: data.endTime ? (data.endTime as Timestamp).toMillis() : undefined, // Ensure conversion for endTime
        status: data.status,
        userId: data.userId,
      };
      return quizSession;
    } else {
      console.log("No such active session document found in Firestore!");
      localStorage.removeItem(ACTIVE_QUIZ_SESSION_ID_KEY);
      return null;
    }
  } catch (error) {
    console.error("Error fetching active quiz session from Firestore:", error);
    return null;
  }
}

export function clearQuizSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_QUIZ_SESSION_ID_KEY);
}

export function buildCategoryTree(uniquePaths: string[]): CategoryTreeNode[] {
  const treeRoot: { children: CategoryTreeNode[] } = { children: [] };
  const nodeMap: Record<string, CategoryTreeNode> = {};
  const sortedPaths = [...new Set(uniquePaths)].filter(Boolean).sort(); // Added .filter(Boolean) to remove empty/null paths

  for (const path of sortedPaths) {
    const parts = path.split('/');
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
        
        if (i === 0) { 
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
    }
  }
  return treeRoot.children;
}
