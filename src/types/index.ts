export interface AnswerOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: AnswerOption[];
  correctAnswerId: string;
  tags: string[];
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswerId?: string;
  isCorrect?: boolean;
  timeTaken: number; // in seconds
  skipped: boolean;
}

export interface QuizSession {
  id: string;
  tag: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: QuizAnswer[];
  startTime: number; // timestamp
  endTime?: number; // timestamp
  status: 'active' | 'completed';
}
