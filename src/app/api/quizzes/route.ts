
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { 
    getAllCategories, 
    getQuestionsByCategoryIdAndDescendants,
    getFullCategoryPath 
} from '@/lib/storage';
import { StartQuizInputSchema } from '@/types';
import type { Question, StorableQuizSession } from '@/types';

// POST /api/quizzes - Start a new quiz
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = StartQuizInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { categoryId, random, questionCount } = validation.data;

    let questionsForSession: Question[] = [];
    let finalQuizCategoryName = "Quiz";
    let finalQuizCategoryId = categoryId || 'random';

    const allCategories = await getAllCategories();

    if (random) {
        const allQuestionsFromAllCats: Question[] = [];
        const topLevelCats = allCategories.filter(c => !c.parentId);
        for (const cat of topLevelCats) {
            const qs = await getQuestionsByCategoryIdAndDescendants(cat.id, allCategories);
            allQuestionsFromAllCats.push(...qs);
        }
        questionsForSession = allQuestionsFromAllCats;
        finalQuizCategoryId = "__ALL_QUESTIONS_RANDOM__";
        finalQuizCategoryName = `Random Quiz`;
    } else if (categoryId) {
        questionsForSession = await getQuestionsByCategoryIdAndDescendants(categoryId, allCategories);
        const selectedCategory = allCategories.find(c => c.id === categoryId);
        finalQuizCategoryName = selectedCategory ? getFullCategoryPath(selectedCategory.id, allCategories) : "Selected Category";
    } else {
        return NextResponse.json({ success: false, error: 'Either categoryId or random=true must be provided.' }, { status: 400 });
    }

    if (questionsForSession.length === 0) {
      return NextResponse.json({ success: false, error: `No questions found for the specified criteria.` }, { status: 404 });
    }

    const shuffleArray = (array: any[]) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };
    
    let finalQuestions = shuffleArray(questionsForSession);
    if (questionCount && questionCount > 0 && questionCount < finalQuestions.length) {
        finalQuestions = finalQuestions.slice(0, questionCount);
    }
    if (random) {
        finalQuizCategoryName = `${finalQuestions.length} Random Questions`;
    }

    const questionsWithShuffledOptions = finalQuestions.map(question => ({
      ...question,
      options: shuffleArray([...question.options]),
    }));

    const newSessionId = crypto.randomUUID();
    const newSessionRef = doc(db, 'quizSessions', newSessionId);

    const newSessionData: StorableQuizSession = {
      id: newSessionId,
      categoryId: finalQuizCategoryId,
      categoryName: finalQuizCategoryName,
      questions: questionsWithShuffledOptions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Timestamp.now(),
      status: 'active',
      totalPausedTime: 0,
    };

    await setDoc(newSessionRef, newSessionData);

    const firstQuestion = questionsWithShuffledOptions.length > 0 ? questionsWithShuffledOptions[0] : null;

    return NextResponse.json({ 
        success: true, 
        data: { 
            quizId: newSessionId,
            totalQuestions: questionsWithShuffledOptions.length,
            categoryName: finalQuizCategoryName,
            firstQuestion: firstQuestion ? {
                id: firstQuestion.id,
                text: firstQuestion.text,
                options: firstQuestion.options
            } : null
        } 
    });

  } catch (error) {
    console.error(`Error in POST /api/quizzes:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
