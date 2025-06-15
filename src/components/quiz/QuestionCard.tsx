
"use client";

import React, { useState, useEffect, useRef } from 'react'; // Added React import
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
  onTimeout: (timeTaken: number) => void; // This will be used for skips as well
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
}

const QUESTION_DURATION = 30; // seconds
const AUTO_ADVANCE_DELAY = 5000; // milliseconds

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

  const triggerSkipOrTimeout = (currentTimeLeft: number) => {
    if (isAnsweredRef.current) return;
    isAnsweredRef.current = true;

    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (visualCountdownTimerRef.current) clearInterval(visualCountdownTimerRef.current);
    setAutoAdvanceMessage(null);
    
    setIsAnswered(true);
    setShowFeedback(true); // To show "Next Question" button and potential feedback
    
    const timeTaken = QUESTION_DURATION - currentTimeLeft;
    onTimeout(timeTaken); // Parent handles setting skipped: true
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
    }
  };

  const handleSkipButtonClick = () => {
    triggerSkipOrTimeout(timeLeft);
  };
  
  const handleTimerTimeout = () => {
    triggerSkipOrTimeout(0); // Time left is 0 when timer fully expires
  };

  const handleShowExplanation = async () => {
    setIsExplanationLoading(true);
    setExplanation(null);
    setShowExplanationDialog(true);

    try {
      const result = await explainAnswerAction({
        questionText: question.text,
        options: question.options.map(opt => ({ id: opt.id, text: opt.text })),
        correctAnswerId: question.correctAnswerId,
        selectedAnswerId: selectedAnswerId, // This will be null if skipped or timed out before selection
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
    if (optionId === question.correctAnswerId) return 'default'; // Will be overridden by getButtonClassNames for accent
    if (optionId === selectedAnswerId && optionId !== question.correctAnswerId) return 'destructive';
    return 'outline';
  };

  const getButtonClassNames = (optionId: string) => {
    if (!showFeedback) return '';
    if (optionId === question.correctAnswerId) return 'bg-accent hover:bg-accent/90 text-accent-foreground animate-pulse';
    // Highlight correct answer if question was skipped (no selectedAnswerId) or answered incorrectly
    if (isAnswered && selectedAnswerId !== question.correctAnswerId && optionId === question.correctAnswerId) {
      return 'border-2 border-accent ring-2 ring-accent';
    }
    if (optionId === selectedAnswerId && optionId !== question.correctAnswerId) return ''; 
    return '';
  };

  const CorrectIcon = <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0" />;
  const IncorrectIcon = <XCircle className="mr-2 h-5 w-5 flex-shrink-0" />;
  const TimeoutIcon = <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />; 

  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-4 text-foreground" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold my-3 text-foreground" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg font-semibold my-2 text-foreground" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-2 leading-relaxed text-foreground" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-relaxed text-foreground" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-foreground" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-foreground" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <pre className={cn("p-2 my-2 bg-muted rounded-md overflow-x-auto font-code text-sm", className)} {...props}>
          <code>{String(children).replace(/\n$/, '')}</code>
        </pre>
      ) : (
        <code className={cn("px-1 py-0.5 bg-muted rounded font-code text-sm", className)} {...props}>
          {children}
        </code>
      )
    },
  };

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto shadow-xl transition-all duration-300 ease-in-out">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="font-headline text-2xl md:text-3xl">Question {questionNumber}/{totalQuestions}</CardTitle>
            <Timer
              key={`${question.id}-${questionNumber}`} // Ensures timer resets for new question
              duration={QUESTION_DURATION}
              onTimeout={handleTimerTimeout} // Use the new handler
              onTick={setTimeLeft}
              isPaused={isAnswered}
              isExternallyAnsweredRef={isAnsweredRef} 
            />
          </div>
          <CardDescription asChild className="text-lg md:text-xl pt-2 min-h-[60px]">
             <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown components={markdownComponents}>
                    {question.text}
                </ReactMarkdown>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {question.options.map((option) => (
            <Button
              key={option.id}
              variant={getButtonVariant(option.id)}
              className={cn(
                "w-full justify-start text-left h-auto py-3 px-4 text-base md:text-lg whitespace-normal transition-all duration-200 ease-in-out transform hover:scale-[1.01]",
                "items-start", // Align icon and text to the top if text wraps
                getButtonClassNames(option.id),
                selectedAnswerId === option.id && "ring-2 ring-offset-2",
                selectedAnswerId === option.id && option.id === question.correctAnswerId && "ring-accent",
                selectedAnswerId === option.id && option.id !== question.correctAnswerId && "ring-destructive",
                 // If answered (by click, skip, or timeout) and this is the correct answer, ensure green highlight.
                isAnswered && option.id === question.correctAnswerId && "bg-accent hover:bg-accent/90 text-accent-foreground",

              )}
              onClick={() => handleAnswerClick(option.id)}
              disabled={isAnswered} 
              aria-pressed={selectedAnswerId === option.id}
            >
              {showFeedback && option.id === selectedAnswerId && option.id === question.correctAnswerId && CorrectIcon}
              {showFeedback && option.id === selectedAnswerId && option.id !== question.correctAnswerId && IncorrectIcon}
              {showFeedback && isAnswered && !selectedAnswerId && option.id === question.correctAnswerId && TimeoutIcon}
              <div className="prose prose-sm dark:prose-invert max-w-none text-inherit">
                <ReactMarkdown components={{ ...markdownComponents, p: React.Fragment }}>
                  {option.text}
                </ReactMarkdown>
              </div>
            </Button>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-4 space-y-4">
          {showFeedback && selectedAnswerId && selectedAnswerId !== question.correctAnswerId && (
            <p className="text-destructive text-center font-medium">
              Correct answer: {question.options.find(opt => opt.id === question.correctAnswerId)?.text}
            </p>
          )}
          {showFeedback && isAnswered && !selectedAnswerId && ( // This covers both skip and timeout before selection
             <p className="text-destructive text-center font-medium">
              {timeLeft <=0 ? "Time's up! " : "Skipped. "}
              The correct answer was: {question.options.find(opt => opt.id === question.correctAnswerId)?.text}
            </p>
          )}

          {isAnswered && selectedAnswerId === question.correctAnswerId && autoAdvanceMessage && (
            <p className="text-sm text-muted-foreground">{autoAdvanceMessage}</p>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
            {!isAnswered && (
                <Button 
                    variant="outline" 
                    onClick={handleSkipButtonClick} 
                    className="w-full sm:w-auto"
                    disabled={isAnswered}
                >
                    <SkipForwardIcon className="mr-2 h-4 w-4" /> Skip Question
                </Button>
            )}

            {showFeedback && (
                <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleShowExplanation}
                disabled={isExplanationLoading}
                >
                {isExplanationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
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
            className="w-full md:w-auto shadow-md transition-transform hover:scale-105"
            >
              {questionNumber === totalQuestions ? 'Finish Quiz' : 'Next Question'} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={showExplanationDialog} onOpenChange={setShowExplanationDialog}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Explanation</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <ScrollArea className="max-h-[55vh] w-full rounded-md">
              <div className="prose prose-sm dark:prose-invert max-w-none p-4">
                  {isExplanationLoading && (
                  <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Generating explanation...</span>
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
