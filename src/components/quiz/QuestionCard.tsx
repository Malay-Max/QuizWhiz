
"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer } from '@/components/quiz/Timer';
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle, SkipForwardIcon, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';


interface QuestionCardProps {
  question: Question;
  onAnswer: (selectedAnswerId: string, timeTaken: number) => void;
  onTimeout: (timeTaken: number) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
}

const QUESTION_DURATION = 30; 
const AUTO_ADVANCE_DELAY = 5000; 

export function QuestionCard({ question, onAnswer, onTimeout, onNext, questionNumber, totalQuestions }: QuestionCardProps) {
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const isAnsweredRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [showFeedback, setShowFeedback] = useState(false);
  const [autoAdvanceMessage, setAutoAdvanceMessage] = useState<string | null>(null);
  const [isQuizPaused, setIsQuizPaused] = useState(false);

  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const visualCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-3xl sm:text-4xl font-bold my-3 text-foreground" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-2xl sm:text-3xl font-semibold my-2.5 text-foreground" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-xl sm:text-2xl font-semibold my-2 text-foreground" {...props} />,
    p: ({node, ...props}: any) => <p className="text-lg sm:text-xl mb-2 leading-relaxed text-foreground" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-lg sm:text-xl text-foreground" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-lg sm:text-xl text-foreground" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-relaxed text-lg sm:text-xl text-foreground" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-foreground" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-foreground" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <pre className={cn("p-2 my-2 bg-muted rounded-md overflow-x-auto font-code text-base sm:text-lg", className)} {...props}>
          <code>{String(children).replace(/\n$/, '')}</code>
        </pre>
      ) : (
        <code className={cn("px-1.5 py-0.5 bg-muted rounded font-code text-base sm:text-lg", className)} {...props}>
          {children}
        </code>
      )
    },
  };
  
const optionMarkdownComponents = { 
    h1: ({node, ...props}: any) => <h1 className="text-2xl sm:text-3xl font-bold my-1 text-inherit" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl sm:text-2xl font-semibold my-1 text-inherit" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg sm:text-xl font-semibold my-0.5 text-inherit" {...props} />,
    p: React.Fragment, 
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-1 space-y-0.5 text-inherit text-base sm:text-lg" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-1 space-y-0.5 text-inherit text-base sm:text-lg" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-relaxed text-inherit text-base sm:text-lg" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-inherit" {...props} />, 
    em: ({node, ...props}: any) => <em className="italic text-inherit" {...props} />, 
    code: ({node, inline, className, children, ...props}: any) => {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
        <pre className={cn("p-1 my-1 bg-muted/50 rounded text-inherit font-code text-sm sm:text-base", className)} {...props}>
        <code>{String(children).replace(/\n$/, '')}</code>
        </pre>
    ) : (
        <code className={cn("px-1 py-0.5 bg-muted/50 rounded text-inherit font-code text-sm sm:text-base", className)} {...props}>
        {children}
        </code>
    )
    },
};


  useEffect(() => {
    setSelectedAnswerId(null);
    setIsAnswered(false);
    isAnsweredRef.current = false;
    setTimeLeft(QUESTION_DURATION);
    setShowFeedback(false);
    setAutoAdvanceMessage(null);
    setIsQuizPaused(false);

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (visualCountdownTimerRef.current) {
      clearInterval(visualCountdownTimerRef.current);
      visualCountdownTimerRef.current = null;
    }
  }, [question.id]);


  const startAutoAdvanceSequence = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (visualCountdownTimerRef.current) clearInterval(visualCountdownTimerRef.current);

    let countdown = AUTO_ADVANCE_DELAY / 1000;
    setAutoAdvanceMessage(`Next question in ${countdown}s...`);

    visualCountdownTimerRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setAutoAdvanceMessage(`Next question in ${countdown}s...`);
      } else {
        if (visualCountdownTimerRef.current) clearInterval(visualCountdownTimerRef.current);
      }
    }, 1000);

    autoAdvanceTimerRef.current = setTimeout(() => {
      setAutoAdvanceMessage(null);
      if (visualCountdownTimerRef.current) {
        clearInterval(visualCountdownTimerRef.current);
        visualCountdownTimerRef.current = null;
      }
      onNext();
    }, AUTO_ADVANCE_DELAY);
  };
  
  useEffect(() => {
    if (isAnsweredRef.current) {
        const wasCorrect = selectedAnswerId === question.correctAnswerId;
        const wasSkippedOrTimedOut = selectedAnswerId === null && isAnsweredRef.current; 
        
        if (wasCorrect || wasSkippedOrTimedOut) {
            const timeoutId = setTimeout(() => {
                startAutoAdvanceSequence();
            }, 100); 
            return () => clearTimeout(timeoutId);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnsweredRef.current, selectedAnswerId, question.correctAnswerId]);


  const triggerSkipOrTimeout = (currentTimeLeft: number) => {
    if (isAnsweredRef.current) return;
    isAnsweredRef.current = true;

    setSelectedAnswerId(null); 
    setIsAnswered(true);
    setShowFeedback(true);

    const timeTaken = QUESTION_DURATION - currentTimeLeft;
    onTimeout(timeTaken); 
    startAutoAdvanceSequence(); 
  };

  const handleAnswerClick = (answerId: string) => {
    if (isAnsweredRef.current || isQuizPaused) return;
    isAnsweredRef.current = true;

    const timeTaken = QUESTION_DURATION - timeLeft;
    setSelectedAnswerId(answerId);
    setIsAnswered(true);
    setShowFeedback(true);
    onAnswer(answerId, timeTaken);

    const isCorrect = question.correctAnswerId === answerId;
    if (isCorrect) {
        startAutoAdvanceSequence();
    } else {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      if (visualCountdownTimerRef.current) clearInterval(visualCountdownTimerRef.current);
      setAutoAdvanceMessage(null);
    }
  };
  
  const handleSkipButtonClick = () => {
    triggerSkipOrTimeout(timeLeft);
  };

  const handleTimerTimeout = () => {
    triggerSkipOrTimeout(0);
  };

  const getButtonVariant = (optionId: string) => {
    if (!showFeedback) return 'outline';
    if (optionId === question.correctAnswerId) return 'default';
    if (optionId === selectedAnswerId && optionId !== question.correctAnswerId) return 'destructive';
    return 'outline';
  };

  const getButtonClassNames = (optionId: string) => {
    if (!showFeedback) return '';
    if (optionId === question.correctAnswerId) return 'bg-accent hover:bg-accent/90 text-accent-foreground animate-pulse';
    if (isAnswered && (selectedAnswerId !== question.correctAnswerId || selectedAnswerId === null) && optionId === question.correctAnswerId) {
      return 'border-2 border-accent ring-2 ring-accent bg-accent/10';
    }
    if (optionId === selectedAnswerId && optionId !== question.correctAnswerId) return ''; 
    return '';
  };

  const CorrectIcon = <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />;
  const IncorrectIcon = <XCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />;
  const TimeoutIcon = <AlertTriangle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />;


  return (
    <>
      <Card className="w-full max-w-3xl mx-auto shadow-xl transition-all duration-300 ease-in-out">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
            <CardTitle className="font-headline text-lg sm:text-xl md:text-2xl break-words">
              Question {questionNumber}/{totalQuestions}
            </CardTitle>
            <div className="w-full sm:flex-1">
              <Timer
                key={`${question.id}-${questionNumber}`}
                duration={QUESTION_DURATION}
                onTimeout={handleTimerTimeout}
                onTick={setTimeLeft}
                isPaused={isAnswered || isQuizPaused}
                isExternallyAnsweredRef={isAnsweredRef}
              />
            </div>
          </div>
          <CardDescription asChild className="pt-1 prose prose-base sm:prose-lg dark:prose-invert max-w-none">
             <div className={cn("relative", isQuizPaused && "blur-sm pointer-events-none")}>
                <ReactMarkdown components={markdownComponents}>
                    {question.text}
                </ReactMarkdown>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6 relative">
           {isQuizPaused && (
            <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center rounded-lg">
                <div className="text-center">
                    <p className="text-xl font-semibold">Quiz Paused</p>
                    <Button onClick={() => setIsQuizPaused(false)} className="mt-4">
                        <Play className="mr-2 h-4 w-4" /> Resume
                    </Button>
                </div>
            </div>
          )}
          {question.options.map((option) => (
            <Button
              key={option.id}
              variant={getButtonVariant(option.id)}
              className={cn(
                "w-full justify-start text-left h-auto py-2.5 sm:py-3 px-3 sm:px-4 text-sm sm:text-base whitespace-normal transition-all duration-200 ease-in-out transform hover:scale-[1.01]",
                "items-start", 
                getButtonClassNames(option.id),
                selectedAnswerId === option.id && "ring-2 ring-offset-2",
                selectedAnswerId === option.id && option.id === question.correctAnswerId && "ring-accent",
                selectedAnswerId === option.id && option.id !== question.correctAnswerId && "ring-destructive",
                isAnswered && option.id === question.correctAnswerId && "bg-accent hover:bg-accent/90 text-accent-foreground",
              )}
              onClick={() => handleAnswerClick(option.id)}
              disabled={isAnswered || isQuizPaused}
              aria-pressed={selectedAnswerId === option.id}
            >
              {showFeedback && option.id === selectedAnswerId && option.id === question.correctAnswerId && CorrectIcon}
              {showFeedback && option.id === selectedAnswerId && option.id !== question.correctAnswerId && IncorrectIcon}
              {showFeedback && isAnswered && selectedAnswerId === null && option.id === question.correctAnswerId && TimeoutIcon}
              <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-none text-inherit min-w-0">
                <ReactMarkdown components={optionMarkdownComponents}>
                  {option.text}
                </ReactMarkdown>
              </div>
            </Button>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-3 space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
          {showFeedback && selectedAnswerId && selectedAnswerId !== question.correctAnswerId && (
             <div className="text-destructive text-center font-medium text-xs sm:text-sm flex items-baseline justify-center gap-1 flex-wrap">
              <span>Correct answer:</span>
              <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none text-inherit">
                <ReactMarkdown components={optionMarkdownComponents}>
                    {question.options.find(opt => opt.id === question.correctAnswerId)?.text || ''}
                </ReactMarkdown>
              </div>
            </div>
          )}
          {showFeedback && isAnswered && !selectedAnswerId && (
            <div className="text-destructive text-center font-medium text-xs sm:text-sm flex items-baseline justify-center gap-1 flex-wrap">
              <span>
                {timeLeft <=0 ? "Time's up! " : "Skipped. "}
                The correct answer was:
              </span>
              <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none text-inherit">
                <ReactMarkdown components={optionMarkdownComponents}>
                    {question.options.find(opt => opt.id === question.correctAnswerId)?.text || ''}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {isAnswered && autoAdvanceMessage && (
            <p className="text-xs sm:text-sm text-muted-foreground">{autoAdvanceMessage}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
            {!isAnswered && (
                <>
                    <Button
                        variant="outline"
                        onClick={() => setIsQuizPaused(true)}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                        disabled={isAnswered || isQuizPaused}
                    >
                        <Pause className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Pause
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleSkipButtonClick}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                        disabled={isAnswered || isQuizPaused}
                    >
                        <SkipForwardIcon className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Skip Question
                    </Button>
                </>
            )}
          </div>

          {isAnswered && (
            <Button onClick={() => {
              if (autoAdvanceTimerRef.current) {
                clearTimeout(autoAdvanceTimerRef.current);
                autoAdvanceTimerRef.current = null;
              }
              if (visualCountdownTimerRef.current) {
                clearInterval(visualCountdownTimerRef.current);
                visualCountdownTimerRef.current = null;
              }
              setAutoAdvanceMessage(null);
              onNext();
            }}
            size="lg"
            className="w-full md:w-auto shadow-md transition-transform hover:scale-105 text-sm sm:text-base"
            >
              {questionNumber === totalQuestions ? 'Finish Quiz' : 'Next Question'} <ArrowRight className="ml-1.5 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
    

    




    