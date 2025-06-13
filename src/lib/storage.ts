
"use client";

import type { Question, QuizSession, CategoryTreeNode } from '@/types';
import { db, auth } from './firebase'; // Import auth
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, Timestamp 
} from 'firebase/firestore';

const QUESTIONS_COLLECTION = 'questions';
const QUIZ_SESSIONS_COLLECTION = 'quizSessions';
const ACTIVE_QUIZ_SESSION_ID_KEY = 'quizcraft_active_session_id'; // Used for localStorage

// Internal StorableQuizSession type
interface StorableQuizSession extends Omit<QuizSession, 'startTime' | 'endTime' | 'userId'> {
  startTime: Timestamp | number;
  endTime?: Timestamp | number;
  userId?: string; // Added for Firebase Auth
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

export async function addQuestion(question: Omit<Question, 'id'> & { id?: string }): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  // Add Firestore rule check simulation: if (!auth.currentUser) throw new Error("User must be authenticated to add questions");
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
  // Add Firestore rule check simulation: if (!auth.currentUser) throw new Error("User must be authenticated to update questions");
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, updatedQuestion.id);
    const { id, ...dataToUpdate } = updatedQuestion;
    await setDoc(questionRef, dataToUpdate, { merge: true });
  } catch (error) {
    console.error("Error updating question in Firestore:", error);
  }
}

export async function deleteQuestionById(questionId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  // Add Firestore rule check simulation: if (!auth.currentUser) throw new Error("User must be authenticated to delete questions");
  try {
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, questionId));
  } catch (error) {
    console.error("Error deleting question from Firestore:", error);
  }
}

export async function deleteQuestionsByCategory(categoryPath: string): Promise<void> {
  if (typeof window === 'undefined') return;
  // Add Firestore rule check simulation: if (!auth.currentUser) throw new Error("User must be authenticated to delete categories");
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
  return [...new Set(allCategories)].filter(c => c && typeof c === 'string' && c.trim() !== "").sort();
}

// --- Quiz Session Functions ---
export async function saveQuizSession(session: QuizSession): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const sessionRef = doc(db, QUIZ_SESSIONS_COLLECTION, session.id);
    const user = auth.currentUser; // Get current user from Firebase Auth

    const sessionToStore: StorableQuizSession = {
      id: session.id,
      category: session.category,
      questions: session.questions, // Storing full questions might be heavy, consider storing IDs and fetching. For now, keeping as is.
      currentQuestionIndex: session.currentQuestionIndex,
      answers: session.answers,
      status: session.status,
      startTime: typeof session.startTime === 'number' ? Timestamp.fromMillis(session.startTime) : session.startTime,
      endTime: session.endTime ? (typeof session.endTime === 'number' ? Timestamp.fromMillis(session.endTime) : session.endTime) : undefined,
      ...(user && { userId: user.uid }), // Conditionally add userId
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
      const quizSession: QuizSession = {
        id: docSnap.id,
        category: data.category,
        questions: data.questions,
        currentQuestionIndex: data.currentQuestionIndex,
        answers: data.answers,
        startTime: (data.startTime as Timestamp).toMillis(),
        endTime: data.endTime ? (data.endTime as Timestamp).toMillis() : undefined,
        status: data.status,
        userId: data.userId, // Include userId
      };
      return quizSession;
    } else {
      console.log("No such active session document found in Firestore!");
      localStorage.removeItem(ACTIVE_QUIZ_SESSION_ID_KEY); // Clean up stale ID
      return null;
    }
  } catch (error) {
    console.error("Error fetching active quiz session from Firestore:", error);
    // Potentially clear local storage if there's an auth error or permissions issue fetching
    // For now, just log and return null.
    return null;
  }
}

export function clearQuizSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_QUIZ_SESSION_ID_KEY);
  // Note: This does not delete the session from Firestore, only clears the local "active" pointer.
  // If you want to delete from Firestore, you'd call:
  // const activeSessionId = localStorage.getItem(ACTIVE_QUIZ_SESSION_ID_KEY);
  // if (activeSessionId && auth.currentUser) { // Check if user is auth'd for delete rules
  //   deleteDoc(doc(db, QUIZ_SESSIONS_COLLECTION, activeSessionId)).catch(err => console.error("Error deleting session doc:", err));
  // }
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
      currentParentChildrenList = node.children;
    }
  }
  return treeRoot.children;
}
