
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

export function getCategories(): string[] {
  if (typeof window === 'undefined') return [];
  const questions = getQuestions();
  const allCategories = questions.map(q => q.category);
  return [...new Set(allCategories)].filter(c => c && c.trim() !== "").sort();
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

export function getQuestionById(id: string): Question | undefined {
  if (typeof window === 'undefined') return undefined;
  const questions = getQuestions();
  return questions.find(q => q.id === id);
}

export function buildCategoryTree(uniquePaths: string[]): CategoryTreeNode[] {
  const treeRoot: { children: CategoryTreeNode[] } = { children: [] };
  // Use a map to keep track of nodes already created to avoid duplicates and to link children correctly.
  const nodeMap: Record<string, CategoryTreeNode> = {};

  // Sort paths to ensure parent paths are processed before their children,
  // e.g., "A" before "A/B".
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
        
        // Find the correct parent list to push this new node into.
        // If i === 0, it's a root node. Otherwise, it's a child of the node from the previous part.
        if (i === 0) {
            currentParentChildrenList.push(node);
        } else {
            const parentPath = parts.slice(0, i).join('/');
            const parentNode = nodeMap[parentPath];
            if (parentNode) {
                 // Ensure not to add duplicate children if paths are structured like "A", "A/B"
                 if (!parentNode.children.some(child => child.path === node.path)) {
                    parentNode.children.push(node);
                 }
            }
        }
      }
      // For the next iteration, this node's children list is the new parent list.
      currentParentChildrenList = node.children;
    }
  }
  return treeRoot.children;
}
