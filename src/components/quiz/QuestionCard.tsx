"use client";

import type { Question, AnswerOption } from '@/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer } from '@/components/quiz/Timer';
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  onAnswer: (selectedAnswerId: string, timeTaken: number) => void;
  onTimeout: (timeTaken: number) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
}

const QUESTION_DURATION = 30; // seconds

export function QuestionCard({ question, onAnswer, onTimeout, onNext, questionNumber, totalQuestions }: QuestionCardProps) {
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    setSelectedAnswerId(null);
    setIsAnswered(false);
    setTimeLeft(QUESTION_DURATION);
    setShowFeedback(false);
  }, [question.id]);

  const handleAnswerClick = (answerId: string) => {
    if (isAnswered) return;

    const timeTaken = QUESTION_DURATION - timeLeft;
    setSelectedAnswerId(answerId);
    setIsAnswered(true);
    setShowFeedback(true);
    onAnswer(answerId, timeTaken);
  };

  const handleTimeout = () => {
    if (isAnswered) return; // Already answered before timeout

    setIsAnswered(true);
    setShowFeedback(true); // Show correct answer in red
    onTimeout(QUESTION_DURATION);
  };

  const getButtonVariant = (optionId: string) => {
    if (!showFeedback) return 'outline';
    if (optionId === question.correctAnswerId) return 'default'; // Green via CSS custom
    if (optionId === selectedAnswerId && optionId !== question.correctAnswerId) return 'destructive'; // Red
    return 'outline';
  };
  
  const getButtonClassNames = (optionId: string) => {
    if (!showFeedback) return '';
    if (optionId === question.correctAnswerId) return 'bg-accent hover:bg-accent/90 text-accent-foreground animate-pulse';
    // If timed out and this is the correct answer, but not selected
    if (isAnswered && !selectedAnswerId && optionId === question.correctAnswerId) return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-pulse';
    if (optionId === selectedAnswerId && optionId !== question.correctAnswerId) return ''; // Default destructive styling handles this
    return '';
  };

  const CorrectIcon = <CheckCircle2 className="mr-2 h-5 w-5" />;
  const IncorrectIcon = <XCircle className="mr-2 h-5 w-5" />;
  const TimeoutIcon = <AlertTriangle className="mr-2 h-5 w-5" />;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl transition-all duration-300 ease-in-out">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
            <CardTitle className="font-headline text-2xl md:text-3xl">Question {questionNumber}/{totalQuestions}</CardTitle>
            <Timer
                key={question.id} // Force reset timer on new question
                duration={QUESTION_DURATION}
                onTimeout={handleTimeout}
                onTick={setTimeLeft}
                isPaused={isAnswered}
            />
        </div>
        <CardDescription className="text-lg md:text-xl pt-2 min-h-[60px]">{question.text}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.options.map((option) => (
          <Button
            key={option.id}
            variant={getButtonVariant(option.id)}
            className={cn(
              "w-full justify-start text-left h-auto py-3 px-4 text-base md:text-lg whitespace-normal transition-all duration-200 ease-in-out transform hover:scale-[1.01]",
              getButtonClassNames(option.id),
              selectedAnswerId === option.id && "ring-2 ring-offset-2",
              selectedAnswerId === option.id && option.id === question.correctAnswerId && "ring-accent",
              selectedAnswerId === option.id && option.id !== question.correctAnswerId && "ring-destructive",
              isAnswered && !selectedAnswerId && option.id === question.correctAnswerId && "ring-2 ring-offset-2 ring-destructive" // Timeout correct answer highlight
            )}
            onClick={() => handleAnswerClick(option.id)}
            disabled={isAnswered}
            aria-pressed={selectedAnswerId === option.id}
          >
            {showFeedback && option.id === selectedAnswerId && option.id === question.correctAnswerId && CorrectIcon}
            {showFeedback && option.id === selectedAnswerId && option.id !== question.correctAnswerId && IncorrectIcon}
            {showFeedback && isAnswered && !selectedAnswerId && option.id === question.correctAnswerId && TimeoutIcon}
            {option.text}
          </Button>
        ))}
      </CardContent>
      <CardFooter className="flex flex-col items-center pt-4">
        {showFeedback && selectedAnswerId && selectedAnswerId !== question.correctAnswerId && (
          <p className="text-destructive text-center mb-3 font-medium">
            Correct answer: {question.options.find(opt => opt.id === question.correctAnswerId)?.text}
          </p>
        )}
        {showFeedback && !selectedAnswerId && ( // Timeout feedback
           <p className="text-destructive text-center mb-3 font-medium">
            Time's up! The correct answer was: {question.options.find(opt => opt.id === question.correctAnswerId)?.text}
          </p>
        )}
        {isAnswered && (
          <Button onClick={onNext} size="lg" className="w-full md:w-auto shadow-md transition-transform hover:scale-105">
            {questionNumber === totalQuestions ? 'Finish Quiz' : 'Next Question'} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
