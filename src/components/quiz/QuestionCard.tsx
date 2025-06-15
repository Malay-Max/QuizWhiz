
"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer } from '@/components/quiz/Timer';
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle, Lightbulb, Loader2, SkipForwardIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { explainAnswerAction } from '@/app/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
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
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [showExplanationDialog, setShowExplanationDialog] = useState(false);
  const [autoAdvanceMessage, setAutoAdvanceMessage] = useState<string | null>(null);

  const { toast } = useToast();

  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const visualCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold my-2.5 text-foreground" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold my-2 text-foreground" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg sm:text-xl md:text-2xl font-semibold my-1.5 text-foreground" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-2 leading-relaxed text-base sm:text-lg md:text-xl text-foreground" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 sm:pl-6 mb-2 space-y-1 text-base sm:text-lg md:text-xl" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 sm:pl-6 mb-2 space-y-1 text-base sm:text-lg md:text-xl" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-relaxed text-foreground" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-foreground" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-foreground" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <pre className={cn("p-2 my-2 bg-muted rounded-md overflow-x-auto font-code text-sm sm:text-base", className)} {...props}>
          <code>{String(children).replace(/\n$/, '')}</code>
        </pre>
      ) : (
        <code className={cn("px-1.5 py-0.5 bg-muted rounded font-code text-sm sm:text-base", className)} {...props}>
          {children}
        </code>
      )
    },
  };
  
  const optionMarkdownComponents = { ...markdownComponents, p: React.Fragment };


  useEffect(() => {
    setSelectedAnswerId(null);
    setIsAnswered(false);
    isAnsweredRef.current = false;
    setTimeLeft(QUESTION_DURATION);
    setShowFeedback(false);
    setExplanation(null);
    setIsExplanationLoading(false);
    setShowExplanationDialog(false); 
    setAutoAdvanceMessage(null);

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
    if (!showExplanationDialog && isAnsweredRef.current) {
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
  }, [showExplanationDialog, isAnsweredRef.current, selectedAnswerId, question.correctAnswerId]);


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
    if (isAnsweredRef.current) return;
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

  const handleShowExplanation = async () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (visualCountdownTimerRef.current) {
      clearInterval(visualCountdownTimerRef.current);
      visualCountdownTimerRef.current = null;
    }
    setAutoAdvanceMessage(null);

    setIsExplanationLoading(true);
    setExplanation(null);
    setShowExplanationDialog(true);

    try {
      const result = await explainAnswerAction({
        questionText: question.text,
        options: question.options.map(opt => ({ id: opt.id, text: opt.text })),
        correctAnswerId: question.correctAnswerId,
        selectedAnswerId: selectedAnswerId,
      });

      if (result.success && result.data) {
        setExplanation(result.data.explanation);
      } else {
        setExplanation(result.error || "Failed to load explanation.");
        toast({ title: "Explanation Error", description: result.error || "Could not generate explanation.", variant: "destructive"});
      }
    } catch (error) {
      console.error("Error in handleShowExplanation:", error);
      setExplanation("An unexpected error occurred while fetching the explanation.");
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive"});
    } finally {
      setIsExplanationLoading(false);
    }
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
    if (isAnswered && selectedAnswerId !== question.correctAnswerId && optionId === question.correctAnswerId) {
      return 'border-2 border-accent ring-2 ring-accent';
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
        <CardHeader>
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
                isPaused={isAnswered}
                isExternallyAnsweredRef={isAnsweredRef}
              />
            </div>
          </div>
          <CardDescription asChild className="text-sm sm:text-base md:text-lg pt-1 prose prose-sm sm:prose-base dark:prose-invert max-w-none">
             <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown components={markdownComponents}>
                    {question.text}
                </ReactMarkdown>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          {question.options.map((option) => (
            <Button
              key={option.id}
              variant={getButtonVariant(option.id)}
              className={cn(
                "w-full justify-start text-left h-auto py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm md:text-base whitespace-normal transition-all duration-200 ease-in-out transform hover:scale-[1.01]",
                "items-start", 
                getButtonClassNames(option.id),
                selectedAnswerId === option.id && "ring-2 ring-offset-2",
                selectedAnswerId === option.id && option.id === question.correctAnswerId && "ring-accent",
                selectedAnswerId === option.id && option.id !== question.correctAnswerId && "ring-destructive",
                isAnswered && option.id === question.correctAnswerId && "bg-accent hover:bg-accent/90 text-accent-foreground",
              )}
              onClick={() => handleAnswerClick(option.id)}
              disabled={isAnswered}
              aria-pressed={selectedAnswerId === option.id}
            >
              {showFeedback && option.id === selectedAnswerId && option.id === question.correctAnswerId && CorrectIcon}
              {showFeedback && option.id === selectedAnswerId && option.id !== question.correctAnswerId && IncorrectIcon}
              {showFeedback && isAnswered && !selectedAnswerId && option.id === question.correctAnswerId && TimeoutIcon}
              <div className="prose prose-sm dark:prose-invert max-w-none text-inherit min-w-0">
                <ReactMarkdown components={optionMarkdownComponents}>
                  {option.text}
                </ReactMarkdown>
              </div>
            </Button>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-3 space-y-3">
          {showFeedback && selectedAnswerId && selectedAnswerId !== question.correctAnswerId && (
            <p className="text-destructive text-center font-medium text-xs sm:text-sm">
              Correct answer: {question.options.find(opt => opt.id === question.correctAnswerId)?.text}
            </p>
          )}
          {showFeedback && isAnswered && !selectedAnswerId && (
             <p className="text-destructive text-center font-medium text-xs sm:text-sm">
              {timeLeft <=0 ? "Time's up! " : "Skipped. "}
              The correct answer was: {question.options.find(opt => opt.id === question.correctAnswerId)?.text}
            </p>
          )}

          {isAnswered && autoAdvanceMessage && (
            <p className="text-xs sm:text-sm text-muted-foreground">{autoAdvanceMessage}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
            {!isAnswered && (
                <Button
                    variant="outline"
                    onClick={handleSkipButtonClick}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                    disabled={isAnswered}
                >
                    <SkipForwardIcon className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Skip Question
                </Button>
            )}

            {showFeedback && (
                <Button
                variant="outline"
                className="w-full sm:w-auto text-xs sm:text-sm"
                onClick={handleShowExplanation}
                disabled={isExplanationLoading}
                >
                {isExplanationLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Lightbulb className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                Show Explanation
                </Button>
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

      <AlertDialog open={showExplanationDialog} onOpenChange={setShowExplanationDialog}>
        <AlertDialogContent className="max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl md:text-2xl">Explanation</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <ScrollArea className="max-h-[50vh] sm:max-h-[60vh] w-full rounded-md">
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none p-1 sm:p-2 md:p-4 text-xs sm:text-sm">
                  {isExplanationLoading && (
                  <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                      <span className="ml-2 text-xs sm:text-sm">Generating explanation...</span>
                  </div>
                  )}
                  {!isExplanationLoading && explanation && (
                  <ReactMarkdown components={markdownComponents}>
                      {explanation}
                  </ReactMarkdown>
                  )}
                  {!isExplanationLoading && !explanation && "No explanation available or an error occurred."}
              </div>
            </ScrollArea>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowExplanationDialog(false)} disabled={isExplanationLoading}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    