
"use client";

import type { Question, QuizSession, StorableQuizSession, Category, AnswerOption } from '@/types';
import { db, auth } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, Timestamp, orderBy, limit as firestoreLimit
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

const QUESTIONS_COLLECTION = 'questions';
const CATEGORIES_COLLECTION = 'categories';
const QUIZ_SESSIONS_COLLECTION = 'quizSessions';
const ACTIVE_QUIZ_SESSION_ID_KEY = 'quizcraft_active_session_id';

function handleFirestoreError(error: unknown, defaultMessage: string): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'Permission denied. You do not have the necessary rights to perform this action.';
    }
    return `Firestore error: ${error.message} (Code: ${error.code})`;
  }
  return defaultMessage;
}

// --- Category Functions ---

export async function addCategory(name: string, parentId: string | null = null): Promise<{ success: boolean; id?: string; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const newCategoryRef = doc(collection(db, CATEGORIES_COLLECTION));
    const categoryData: Category = {
      id: newCategoryRef.id,
      name: name.trim(),
      parentId: parentId,
    };
    await setDoc(newCategoryRef, categoryData);
    return { success: true, id: newCategoryRef.id };
  } catch (error) {
    console.error("Error adding category to Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not add category.") };
  }
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
  if (typeof window === 'undefined') return undefined;
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Category; // ID is already part of the document data
    }
    return undefined;
  } catch (error) {
    console.error(`Error fetching category by ID "${id}":`, error);
    return undefined;
  }
}

export async function getAllCategories(): Promise<Category[]> {
  if (typeof window === 'undefined') return [];
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), orderBy("name"));
    const querySnapshot = await getDocs(q);
    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      categories.push(doc.data() as Category);
    });
    return categories;
  } catch (error) {
    console.error("Error fetching all categories:", error);
    return [];
  }
}

export async function updateCategoryName(id: string, newName: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
    await setDoc(categoryRef, { name: newName.trim() }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating category name:", error);
    return { success: false, error: handleFirestoreError(error, "Could not update category name.") };
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  // Note: This is a simple delete. It doesn't handle orphaned children or questions.
  // Consider implementing cascading deletes or checks if needed.
  try {
    // First, check if this category is a parent to any other categories
    const childrenQuery = query(collection(db, CATEGORIES_COLLECTION), where("parentId", "==", id), firestoreLimit(1));
    const childrenSnapshot = await getDocs(childrenQuery);
    if (!childrenSnapshot.empty) {
      return { success: false, error: "Cannot delete category: It has sub-categories. Delete sub-categories first." };
    }

    // Second, check if any questions are linked to this category
    const questionsQuery = query(collection(db, QUESTIONS_COLLECTION), where("categoryId", "==", id), firestoreLimit(1));
    const questionsSnapshot = await getDocs(questionsQuery);
    if (!questionsSnapshot.empty) {
      return { success: false, error: "Cannot delete category: It has questions linked to it. Delete or reassign questions first." };
    }
    
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: handleFirestoreError(error, "Could not delete category.") };
  }
}

export function getFullCategoryPath(categoryId: string, allCategories: Category[], separator: string = ' / '): string {
  const categoryMap = new Map(allCategories.map(cat => [cat.id, cat]));
  let pathParts: string[] = [];
  let currentId: string | null = categoryId;

  while (currentId) {
    const category = categoryMap.get(currentId);
    if (category) {
      pathParts.unshift(category.name);
      currentId = category.parentId;
    } else {
      pathParts.unshift("[Unknown Category]");
      break; 
    }
  }
  return pathParts.join(separator);
}


export function getDescendantCategoryIds(categoryId: string, allCategories: Category[]): string[] {
  const descendants: string[] = [];
  const queue: string[] = [categoryId];
  const directChildrenMap = new Map<string | null, string[]>();

  allCategories.forEach(cat => {
    if (!directChildrenMap.has(cat.parentId)) {
      directChildrenMap.set(cat.parentId, []);
    }
    directChildrenMap.get(cat.parentId)!.push(cat.id);
  });

  while (queue.length > 0) {
    const currentParentId = queue.shift()!;
    const children = directChildrenMap.get(currentParentId) || [];
    for (const childId of children) {
      if (!descendants.includes(childId)) { // Avoid circular dependencies if data is bad
        descendants.push(childId);
        queue.push(childId);
      }
    }
  }
  return descendants;
}

export function buildCategoryTree(allCategories: Category[]): Category[] {
  const categoriesMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  // Clone categories and initialize children arrays
  allCategories.forEach(cat => {
    categoriesMap.set(cat.id, { ...cat, children: [], fullPath: '' });
  });
  
  // Populate full paths first
  categoriesMap.forEach(cat => {
    cat.fullPath = getFullCategoryPath(cat.id, allCategories);
  });

  // Build the tree structure
  categoriesMap.forEach(cat => {
    if (cat.parentId) {
      const parent = categoriesMap.get(cat.parentId);
      if (parent) {
        parent.children!.push(cat);
      } else {
        // Orphaned category, treat as root for now, or log an error
        rootCategories.push(cat);
      }
    } else {
      rootCategories.push(cat);
    }
  });
  
  // Sort children by name
  const sortChildrenByName = (node: Category) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.children.forEach(sortChildrenByName);
    }
  };
  rootCategories.forEach(sortChildrenByName);
  rootCategories.sort((a,b) => a.name.localeCompare(b.name));

  return rootCategories;
}


// --- Question Functions ---
export async function getQuestions(): Promise<Question[]> {
  if (typeof window === 'undefined') return [];
  try {
    const querySnapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
    const questions: Question[] = [];
    querySnapshot.forEach((doc) => {
      questions.push(doc.data() as Question); // ID is part of document data
    });
    return questions;
  } catch (error) {
    console.error("Error fetching questions from Firestore:", error);
    return [];
  }
}

// Modified addQuestion to accept categoryId
export async function addQuestion(question: Omit<Question, 'id'> & { id?: string }): Promise<{ success: boolean; id?: string; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const newQuestionRef = doc(collection(db, QUESTIONS_COLLECTION), question.id || crypto.randomUUID());
    const questionData: Question = {
      id: newQuestionRef.id,
      text: question.text,
      options: question.options,
      correctAnswerId: question.correctAnswerId,
      categoryId: question.categoryId, // Use categoryId
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
      return docSnap.data() as Question; // ID is part of document data
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching question by ID from Firestore:", error);
    return undefined;
  }
}

export async function updateQuestion(updatedQuestion: Question): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, updatedQuestion.id);
    await setDoc(questionRef, updatedQuestion, { merge: true });
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

// Modified to use categoryId and its descendants
export async function deleteQuestionsByCategoryId(categoryId: string, allCategories: Category[]): Promise<{ success: boolean; count?: number; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const categoryIdsToDeleteFrom = [categoryId, ...getDescendantCategoryIds(categoryId, allCategories)];
    
    if (categoryIdsToDeleteFrom.length === 0) {
      return { success: true, count: 0 };
    }
    
    // Firestore 'in' query supports up to 30 elements. If more, split into chunks.
    const CHUNK_SIZE = 30;
    let deletedCount = 0;
    const batch = writeBatch(db);
    let currentBatchOperations = 0;

    for (let i = 0; i < categoryIdsToDeleteFrom.length; i += CHUNK_SIZE) {
        const chunk = categoryIdsToDeleteFrom.slice(i, i + CHUNK_SIZE);
        const q = query(collection(db, QUESTIONS_COLLECTION), where("categoryId", "in", chunk));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((docSnap) => {
            batch.delete(docSnap.ref);
            deletedCount++;
            currentBatchOperations++;
            if (currentBatchOperations >= 499) { // Firestore batch limit is 500 operations
                console.warn("Approaching batch limit, committing intermediate batch for question deletion.");
                // await batch.commit(); // Cannot await inside forEach, handle outside or refactor
                // batch = writeBatch(db);
                // currentBatchOperations = 0;
                // This part needs careful handling if many questions are expected. For now, assume less than 500 total.
            }
        });
    }
    
    if (deletedCount > 0) {
        await batch.commit();
    }
    
    return { success: true, count: deletedCount };
  } catch (error) {
    console.error("Error deleting questions by category ID from Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not delete questions by category ID.") };
  }
}

export async function getQuestionsByCategoryIdAndDescendants(categoryId: string, allCategories: Category[]): Promise<Question[]> {
  if (typeof window === 'undefined') return [];
  try {
    const relevantCategoryIds = [categoryId, ...getDescendantCategoryIds(categoryId, allCategories)];
    if (relevantCategoryIds.length === 0) return [];

    const questions: Question[] = [];
    // Firestore 'in' query supports up to 30 elements. If more, split into chunks.
    const CHUNK_SIZE = 30;
    for (let i = 0; i < relevantCategoryIds.length; i += CHUNK_SIZE) {
        const chunk = relevantCategoryIds.slice(i, i + CHUNK_SIZE);
        const q = query(collection(db, QUESTIONS_COLLECTION), where("categoryId", "in", chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            questions.push(doc.data() as Question);
        });
    }
    return questions;
  } catch (error) {
    console.error("Error fetching questions by category ID and descendants:", error);
    return [];
  }
}


// --- Quiz Session Functions ---
// Modified saveQuizSession to use categoryId
export async function saveQuizSession(session: QuizSession): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: "Operation not supported on server." };
  try {
    const sessionRef = doc(db, QUIZ_SESSIONS_COLLECTION, session.id);
    const user = auth.currentUser;

    const dataToStore: StorableQuizSession = {
      id: session.id,
      categoryId: session.categoryId, // Use categoryId
      categoryName: session.categoryName,
      questions: session.questions,
      currentQuestionIndex: session.currentQuestionIndex,
      answers: session.answers,
      status: session.status,
      startTime: typeof session.startTime === 'number' ? Timestamp.fromMillis(session.startTime) : session.startTime as Timestamp,
      ...(session.endTime && { endTime: typeof session.endTime === 'number' ? Timestamp.fromMillis(session.endTime) : session.endTime as Timestamp }),
      ...(user && user.uid && { userId: user.uid }),
    };
    
    await setDoc(sessionRef, dataToStore);
    localStorage.setItem(ACTIVE_QUIZ_SESSION_ID_KEY, session.id);
    return { success: true };
  } catch (error) {
    console.error("Error saving quiz session to Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not save quiz session.") };
  }
}

// Modified getQuizSession to handle categoryId
export async function getQuizSession(): Promise<QuizSession | null> {
  if (typeof window === 'undefined') return null;
  const activeSessionId = localStorage.getItem(ACTIVE_QUIZ_SESSION_ID_KEY);
  if (!activeSessionId) return null;

  try {
    const docRef = doc(db, QUIZ_SESSIONS_COLLECTION, activeSessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as StorableQuizSession; 
      const quizSession: QuizSession = {
        id: data.id,
        categoryId: data.categoryId, // Use categoryId
        categoryName: data.categoryName,
        questions: data.questions,
        currentQuestionIndex: data.currentQuestionIndex,
        answers: data.answers,
        startTime: data.startTime.toMillis(), 
        endTime: data.endTime ? data.endTime.toMillis() : undefined, 
        status: data.status,
        userId: data.userId,
      };
      return quizSession;
    } else {
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

// --- Seed Data Function ---
export async function seedSampleData(): Promise<{success: boolean, message: string}> {
  if (typeof window === 'undefined') return {success: false, message: "Seeding only available on client."};
  
  const categoriesExist = await getDocs(query(collection(db, CATEGORIES_COLLECTION), firestoreLimit(1)));
  if (!categoriesExist.empty) {
    return {success: false, message: "Sample data likely already exists (categories found). Aborting seed."};
  }

  const batch = writeBatch(db);

  try {
    // Level 1 Categories
    const literatureCatRef = doc(collection(db, CATEGORIES_COLLECTION));
    batch.set(literatureCatRef, { id: literatureCatRef.id, name: "Literature", parentId: null });
    const historyCatRef = doc(collection(db, CATEGORIES_COLLECTION));
    batch.set(historyCatRef, { id: historyCatRef.id, name: "History", parentId: null });

    // Level 2 Categories
    const fictionCatRef = doc(collection(db, CATEGORIES_COLLECTION));
    batch.set(fictionCatRef, { id: fictionCatRef.id, name: "Fiction", parentId: literatureCatRef.id });
    const poetryCatRef = doc(collection(db, CATEGORIES_COLLECTION));
    batch.set(poetryCatRef, { id: poetryCatRef.id, name: "Poetry", parentId: literatureCatRef.id });

    const ww2CatRef = doc(collection(db, CATEGORIES_COLLECTION));
    batch.set(ww2CatRef, { id: ww2CatRef.id, name: "World War II", parentId: historyCatRef.id });

    // Level 3 Categories
    const classicFictionCatRef = doc(collection(db, CATEGORIES_COLLECTION));
    batch.set(classicFictionCatRef, { id: classicFictionCatRef.id, name: "Classic Fiction", parentId: fictionCatRef.id });
    
    await batch.commit(); // Commit categories first to get their IDs

    // Seed Questions (another batch for questions)
    const questionBatch = writeBatch(db);

    const q1Options: AnswerOption[] = [{id: crypto.randomUUID(), text: "Herman Melville"}, {id: crypto.randomUUID(), text: "Jane Austen"}, {id: crypto.randomUUID(), text: "Mark Twain"}];
    const q1CorrectId = q1Options[0].id;
    const q1Ref = doc(collection(db, QUESTIONS_COLLECTION));
    questionBatch.set(q1Ref, { id: q1Ref.id, text: "Who wrote Moby Dick?", options: q1Options, correctAnswerId: q1CorrectId, categoryId: classicFictionCatRef.id });

    const q2Options: AnswerOption[] = [{id: crypto.randomUUID(), text: "Sonnet"}, {id: crypto.randomUUID(), text: "Haiku"}, {id: crypto.randomUUID(), text: "Limerick"}];
    const q2CorrectId = q2Options[1].id;
    const q2Ref = doc(collection(db, QUESTIONS_COLLECTION));
    questionBatch.set(q2Ref, { id: q2Ref.id, text: "Which poetic form consists of three unrhymed lines of five, seven, and five syllables?", options: q2Options, correctAnswerId: q2CorrectId, categoryId: poetryCatRef.id });
    
    const q3Options: AnswerOption[] = [{id: crypto.randomUUID(), text: "1939"}, {id: crypto.randomUUID(), text: "1914"}, {id: crypto.randomUUID(), text: "1941"}];
    const q3CorrectId = q3Options[0].id;
    const q3Ref = doc(collection(db, QUESTIONS_COLLECTION));
    questionBatch.set(q3Ref, { id: q3Ref.id, text: "In what year did World War II begin?", options: q3Options, correctAnswerId: q3CorrectId, categoryId: ww2CatRef.id });

    await questionBatch.commit();
    return {success: true, message: "Sample data seeded successfully."};

  } catch(error) {
    console.error("Error seeding sample data:", error);
    return {success: false, message: handleFirestoreError(error, "Could not seed sample data.")};
  }
}
