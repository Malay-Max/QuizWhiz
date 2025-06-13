
"use client";

import type { Question, QuizSession, CategoryTreeNode } from '@/types';

const QUESTIONS_KEY = 'quizcraft_questions';
const SESSION_KEY = 'quizcraft_session';

// Question Functions
export function getQuestions(): Question[] {
  if (typeof window === 'undefined') return [];
  const questionsJson = localStorage.getItem(QUESTIONS_KEY);
  return questionsJson ? JSON.parse(questionsJson) : [];
}

export function saveQuestions(questions: Question[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

export function addQuestion(question: Question): void {
  if (typeof window === 'undefined') return;
  const questions = getQuestions();
  questions.push(question);
  saveQuestions(questions);
}

export function getQuestionById(id: string): Question | undefined {
  if (typeof window === 'undefined') return undefined;
  const questions = getQuestions();
  return questions.find(q => q.id === id);
}

export function updateQuestion(updatedQuestion: Question): void {
  if (typeof window === 'undefined') return;
  let questions = getQuestions();
  const questionIndex = questions.findIndex(q => q.id === updatedQuestion.id);
  if (questionIndex > -1) {
    questions[questionIndex] = updatedQuestion;
    saveQuestions(questions);
  }
}

export function deleteQuestionById(questionId: string): void {
  if (typeof window === 'undefined') return;
  let questions = getQuestions();
  questions = questions.filter(q => q.id !== questionId);
  saveQuestions(questions);
}

export function deleteQuestionsByCategory(categoryPath: string): void {
  if (typeof window === 'undefined') return;
  let questions = getQuestions();
  // Keep questions that do NOT start with the categoryPath
  questions = questions.filter(q => !(typeof q.category === 'string' && q.category.startsWith(categoryPath)));
  saveQuestions(questions);
}

export function getCategories(): string[] {
  if (typeof window === 'undefined') return [];
  const questions = getQuestions();
  const allCategories = questions.map(q => q.category);
  return [...new Set(allCategories)].filter(c => c && typeof c === 'string' && c.trim() !== "").sort();
}

// Quiz Session Functions
export function saveQuizSession(session: QuizSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getQuizSession(): QuizSession | null {
  if (typeof window === 'undefined') return null;
  const sessionJson = localStorage.getItem(SESSION_KEY);
  return sessionJson ? JSON.parse(sessionJson) : null;
}

export function clearQuizSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

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
            if (!currentParentChildrenList.some(child => child.path === node.path)) {
                currentParentChildrenList.push(node);
            }
        } else {
            const parentPath = parts.slice(0, i).join('/');
            const parentNode = nodeMap[parentPath];
            if (parentNode) {
                 if (!parentNode.children.some(child => child.path === node.path)) {
                    parentNode.children.push(node);
                 }
            }
        }
      }
      currentParentChildrenList = node.children;
    }
  }
  return treeRoot.children;
}
