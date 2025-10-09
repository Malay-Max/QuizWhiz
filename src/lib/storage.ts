
import type { Question, QuizSession, StorableQuizSession, Category, AnswerOption, BatchQuestion } from '@/types';
import { db, auth } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, Timestamp, orderBy, updateDoc
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { sampleData } from './sample-data';

const QUESTIONS_COLLECTION = 'allQuestions';
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
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Category;
    }
    return undefined;
  } catch (error) {
    console.error(`Error fetching category by ID "${id}":`, error);
    return undefined;
  }
}

export async function getAllCategories(): Promise<Category[]> {
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
  try {
    const allCats = await getAllCategories();
    const targetCategory = allCats.find(c => c.id === id);
    if (!targetCategory) {
      return { success: false, error: "Category not found." };
    }

    const descendantCategoryIds = getDescendantCategoryIds(id, allCats);
    const allCategoryIdsToDelete = [id, ...descendantCategoryIds];

    const batch = writeBatch(db);
    let operationsCount = 0;

    const CHUNK_SIZE = 30; 
    for (let i = 0; i < allCategoryIdsToDelete.length; i += CHUNK_SIZE) {
      const chunk = allCategoryIdsToDelete.slice(i, i + CHUNK_SIZE);
      const questionsQuery = query(collection(db, QUESTIONS_COLLECTION), where("categoryId", "in", chunk));
      const questionsSnapshot = await getDocs(questionsQuery);
      
      questionsSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        operationsCount++;
      });
    }

    allCategoryIdsToDelete.forEach(catId => {
      const categoryRef = doc(db, CATEGORIES_COLLECTION, catId);
      batch.delete(categoryRef);
      operationsCount++;
    });

    if (operationsCount > 0) {
        await batch.commit();
    } else {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
        const categoryDoc = await getDoc(categoryRef);
        if (categoryDoc.exists()) {
           batch.delete(categoryRef);
           await batch.commit();
        }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting category and its sub-content:", error);
    return { success: false, error: handleFirestoreError(error, "Could not delete category and its contents.") };
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
  
  const processedForQueue: string[] = []; 

  while (queue.length > 0) {
    const currentParentId = queue.shift()!;
    if(processedForQueue.includes(currentParentId) && currentParentId !== categoryId) continue; 
    if(currentParentId !== categoryId) processedForQueue.push(currentParentId);


    const children = directChildrenMap.get(currentParentId) || [];
    for (const childId of children) {
      if (!descendants.includes(childId)) { 
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

  allCategories.forEach(cat => {
    categoriesMap.set(cat.id, { ...cat, children: [], fullPath: '' });
  });
  
  categoriesMap.forEach(cat => {
    cat.fullPath = getFullCategoryPath(cat.id, allCategories);
  });

  categoriesMap.forEach(cat => {
    if (cat.parentId) {
      const parent = categoriesMap.get(cat.parentId);
      if (parent) {
        parent.children!.push(cat);
      } else {
        rootCategories.push(cat);
      }
    } else {
      rootCategories.push(cat);
    }
  });
  
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
  try {
    const querySnapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
    const questions: Question[] = [];
    querySnapshot.forEach((doc) => {
      questions.push(doc.data() as Question);
    });
    return questions;
  } catch (error) {
    console.error("Error fetching questions from Firestore:", error);
    return [];
  }
}

export async function addQuestion(question: Omit<Question, 'id'> & { id?: string }): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const newQuestionRef = doc(collection(db, QUESTIONS_COLLECTION), question.id || crypto.randomUUID());
    const questionData: Question = {
      id: newQuestionRef.id,
      text: question.text,
      options: question.options,
      correctAnswerId: question.correctAnswerId,
      categoryId: question.categoryId,
      explanation: question.explanation,
      source: question.source,
    };
    await setDoc(newQuestionRef, questionData);
    return { success: true, id: newQuestionRef.id };
  } catch (error) {
    console.error("Error adding question to Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not add question.") };
  }
}

export async function addQuestionsBatch(questions: BatchQuestion[], categoryId: string): Promise<{ success: boolean; added: number; failed: number, error?: string }> {
    const batch = writeBatch(db);
    let added = 0;
    let failed = 0;

    for (const q of questions) {
        try {
            const options: AnswerOption[] = Object.values(q.options).map(optText => ({ id: crypto.randomUUID(), text: optText }));
            
            const correctOptionKey = q.correctAnswer;
            const correctOptionText = q.options[correctOptionKey];
            const correctOption = options.find(opt => opt.text === correctOptionText);

            if (!correctOption) {
                failed++;
                console.warn(`Could not find correct answer for question: ${q.question}`);
                continue;
            }

            const newQuestionRef = doc(collection(db, QUESTIONS_COLLECTION));
            const newQuestion: Question = {
                id: newQuestionRef.id,
                text: q.question,
                options: options,
                correctAnswerId: correctOption.id,
                categoryId: categoryId,
                explanation: q.explanation,
                source: q.source,
            };
            batch.set(newQuestionRef, newQuestion);
            added++;
        } catch (e) {
            failed++;
            console.error(`Failed to process a question in batch: ${q.question}`, e);
        }
    }

    try {
        await batch.commit();
        return { success: true, added, failed };
    } catch (error) {
        console.error("Error committing batch of questions:", error);
        return { success: false, added: 0, failed: questions.length, error: handleFirestoreError(error, "Failed to save questions.") };
    }
}


export async function getQuestionById(id: string): Promise<Question | undefined> {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Question;
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching question by ID from Firestore:", error);
    return undefined;
  }
}

export async function updateQuestion(updatedQuestion: Question): Promise<{ success: boolean; error?: string }> {
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, updatedQuestion.id);
    await setDoc(questionRef, updatedQuestion, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating question in Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not update question.") };
  }
}

export async function updateQuestionCategory(questionId: string, newCategoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await setDoc(questionRef, { categoryId: newCategoryId }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating question category in Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not update question category.") };
  }
}

export async function deleteQuestionById(questionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, questionId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting question from Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not delete question.") };
  }
}

export async function deleteQuestionsByCategoryId(categoryId: string, allCategories: Category[]): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const categoryIdsToDeleteFrom = [categoryId, ...getDescendantCategoryIds(categoryId, allCategories)];
    
    if (categoryIdsToDeleteFrom.length === 0) {
      return { success: true, count: 0 };
    }
    
    const CHUNK_SIZE = 30;
    let deletedCount = 0;
    const batch = writeBatch(db);
    // let currentBatchOperations = 0; // Not strictly needed if we commit once at the end for simplicity

    for (let i = 0; i < categoryIdsToDeleteFrom.length; i += CHUNK_SIZE) {
        const chunk = categoryIdsToDeleteFrom.slice(i, i + CHUNK_SIZE);
        const q = query(collection(db, QUESTIONS_COLLECTION), where("categoryId", "in", chunk));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((docSnap) => {
            batch.delete(docSnap.ref);
            deletedCount++;
        });
    }
    
    if (deletedCount > 0) { // Only commit if there were actual deletions
        await batch.commit();
    }
    
    return { success: true, count: deletedCount };
  } catch (error) {
    console.error("Error deleting questions by category ID from Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not delete questions by category ID.") };
  }
}

export async function getQuestionsByCategoryIdAndDescendants(categoryId: string, allCategories: Category[]): Promise<Question[]> {
  try {
    const relevantCategoryIds = [categoryId, ...getDescendantCategoryIds(categoryId, allCategories)];
    if (relevantCategoryIds.length === 0) return [];

    const questions: Question[] = [];
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
export async function saveQuizSession(session: QuizSession): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    // This is a client-side function, but let's not error out on the server, just log and return.
    console.warn("Attempted to call saveQuizSession on the server. This is a client-side only function.");
    return { success: false, error: "Operation not supported on server." };
  }
  try {
    const sessionRef = doc(db, QUIZ_SESSIONS_COLLECTION, session.id);
    const user = auth.currentUser;

    const dataToStore: StorableQuizSession = {
      id: session.id,
      categoryId: session.categoryId,
      categoryName: session.categoryName,
      questions: session.questions,
      currentQuestionIndex: session.currentQuestionIndex,
      answers: session.answers,
      status: session.status,
      startTime: typeof session.startTime === 'number' ? Timestamp.fromMillis(session.startTime) : session.startTime as Timestamp,
      ...(session.endTime && { endTime: typeof session.endTime === 'number' ? Timestamp.fromMillis(session.endTime) : session.endTime as Timestamp }),
      ...(user && user.uid && { userId: user.uid }),
      ...(session.pauseTime && { pauseTime: typeof session.pauseTime === 'number' ? Timestamp.fromMillis(session.pauseTime) : session.pauseTime as Timestamp }),
      totalPausedTime: session.totalPausedTime,
    };
    
    await setDoc(sessionRef, dataToStore);
    localStorage.setItem(ACTIVE_QUIZ_SESSION_ID_KEY, session.id);
    return { success: true };
  } catch (error) {
    console.error("Error saving quiz session to Firestore:", error);
    return { success: false, error: handleFirestoreError(error, "Could not save quiz session.") };
  }
}

export async function getQuizSessionById(sessionId: string): Promise<QuizSession | null> {
    if (!sessionId) return null;
    try {
        const docRef = doc(db, QUIZ_SESSIONS_COLLECTION, sessionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as StorableQuizSession;
            return {
                ...data,
                startTime: data.startTime.toMillis(),
                endTime: data.endTime ? data.endTime.toMillis() : undefined,
                pauseTime: data.pauseTime ? data.pauseTime.toMillis() : undefined,
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching quiz session by ID "${sessionId}":`, error);
        return null;
    }
}


export async function getQuizSession(): Promise<QuizSession | null> {
  if (typeof window === 'undefined') return null;
  const activeSessionId = localStorage.getItem(ACTIVE_QUIZ_SESSION_ID_KEY);
  if (!activeSessionId) return null;

  try {
    const session = await getQuizSessionById(activeSessionId);
     if (!session) {
      localStorage.removeItem(ACTIVE_QUIZ_SESSION_ID_KEY);
      return null;
    }
    return session;
  } catch (error) {
    console.error("Error fetching active quiz session from Firestore:", error);
    return null;
  }
}

export function clearQuizSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_QUIZ_SESSION_ID_KEY);
}

// --- Sample Data Seeding ---

export async function seedSampleData(): Promise<{ success: boolean; categoriesAdded?: number; questionsAdded?: number; error?: string }> {
  try {
    const batch = writeBatch(db);
    let categoriesAdded = 0;
    let questionsAdded = 0;

    const processCategory = (category: (typeof sampleData)[0], parentId: string | null) => {
      // Add category
      const categoryRef = doc(db, CATEGORIES_COLLECTION, category.id);
      batch.set(categoryRef, { id: category.id, name: category.name, parentId: parentId });
      categoriesAdded++;
      
      // Add questions for this category
      category.questions.forEach(q => {
        const questionRef = doc(collection(db, QUESTIONS_COLLECTION));
        const answerOptions: AnswerOption[] = q.options.map(optText => ({ id: crypto.randomUUID(), text: optText }));
        const correctOption = answerOptions.find(opt => opt.text === q.correctAnswer);
        
        if (correctOption) {
          const newQuestion: Question = {
            id: questionRef.id,
            text: q.text,
            options: answerOptions,
            correctAnswerId: correctOption.id,
            categoryId: category.id,
            explanation: q.explanation,
            source: q.source,
          };
          batch.set(questionRef, newQuestion);
          questionsAdded++;
        }
      });
      
      // Process children
      if (category.children) {
        category.children.forEach(child => processCategory(child, category.id));
      }
    };
    
    sampleData.forEach(category => processCategory(category, null));

    await batch.commit();
    return { success: true, categoriesAdded, questionsAdded };
  } catch (error) {
    console.error("Error seeding sample data:", error);
    return { success: false, error: handleFirestoreError(error, "Could not seed sample data.") };
  }
}

    