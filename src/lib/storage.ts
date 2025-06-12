"use client";

import type { Question, QuizSession } from '@/types';

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

export function getTags(): string[] {
  if (typeof window === 'undefined') return [];
  const questions = getQuestions();
  const allTags = questions.reduce((acc, q) => [...acc, ...q.tags], [] as string[]);
  return [...new Set(allTags)].sort();
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
