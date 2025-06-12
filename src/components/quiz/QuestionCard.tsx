
"use client";

import type { Question } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer } from '@/components/quiz/Timer';
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';


interface QuestionCardProps {
  question: Question;
  onAnswer: (selectedAnswerId: string, timeTaken: number) => void;
  onTimeout: (timeTaken: number) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
}

const QUESTION_DURATION = 30; // seconds
const AUTO_ADVANCE_DELAY = 5000; // milliseconds

export function QuestionCard({ question, onAnswer, onTimeout, onNext, questionNumber, totalQuestions }: QuestionCardProps) {
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false); // Used to pause the main Timer and disable answer buttons
  const isAnsweredRef = useRef(false); // Used for immediate checks to prevent race conditions
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [showFeedback, setShowFeedback] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [showExplanationDialog, setShowExplanationDialog] = useState(false);
  const [autoAdvanceMessage, setAutoAdvanceMessage] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null); // For the 5s delay before onNext()
  const visualCountdownTimerRef = useRef<NodeJS.Timeout | null>(null); // For the "Next question in Xs..." message interval

  useEffect(() => {
    // Reset state for the new question
    setSelectedAnswerId(null);
    setIsAnswered(false); 
    isAnsweredRef.current = false; // CRITICAL: Reset ref for the new question
    setTimeLeft(QUESTION_DURATION);
    setShowFeedback(false);
    setExplanation(null);
    setIsExplanationLoading(false);
    setShowExplanationDialog(false);
    setAutoAdvanceMessage(null);

    // Clear any pending timers from the previous question
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (visualCountdownTimerRef.current) {
      clearInterval(visualCountdownTimerRef.current);
      visualCountdownTimerRef.current = null;
    }
  }, [question.id]);

  const handleAnswerClick = (answerId: string) => {
    if (isAnsweredRef.current) return; // Already answered this question (via click or timeout)
    isAnsweredRef.current = true;    // Mark as answered IMMEDIATELY

    const timeTaken = QUESTION_DURATION - timeLeft;
    setSelectedAnswerId(answerId);
    setIsAnswered(true); // This will pause the Timer component & disable answer buttons
    setShowFeedback(true);
    onAnswer(answerId, timeTaken); // Notifies parent, sets skipped: false

    const isCorrect = question.correctAnswerId === answerId;

    if (isCorrect) {
      // Clear any existing auto-advance timers first
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      if (visualCountdownTimerRef.current) clearInterval(visualCountdownTimerRef.current);

      let countdown = AUTO_ADVANCE_DELAY / 1000;
      setAutoAdvanceMessage(`Next question in ${countdown}s...`);

      visualCountdownTimerRef.current = setInterval(() => {
        countdown -= 1;
        if (countdown > 0) {
          setAutoAdvanceMessage(`Next question in ${countdown}s...`);
        } else {
          // Message will be cleared by the autoAdvanceTimerRef's timeout or manual next click
          // or when question changes.
          if (visualCountdownTimerRef.current) clearInterval(visualCountdownTimerRef.current);
        }
      }, 1000);

      autoAdvanceTimerRef.current = setTimeout(() => {
        setAutoAdvanceMessage(null); // Clear message
        if (visualCountdownTimerRef.current) { // Ensure visual timer is also cleared
            clearInterval(visualCountdownTimerRef.current);
            visualCountdownTimerRef.current = null;
        }
        onNext();
      }, AUTO_ADVANCE_DELAY);
    }
    // If incorrect, user manually clicks next. No auto-advance.
  };

  const handleTimeout = () => {
    if (isAnsweredRef.current) return; // If already answered (e.g. clicked an option just before timeout), do nothing
    isAnsweredRef.current = true;   // Mark as answered via timeout

    // Clear auto-advance timers if they were somehow running (shouldn't be, but defensive)
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (visualCountdownTimerRef.current) clearInterval(visualCountdownTimerRef.current);
    setAutoAdvanceMessage(null);

    setIsAnswered(true); // Pauses the Timer & disable answer buttons
    setShowFeedback(true);
    onTimeout(QUESTION_DURATION); // Notifies parent, sets skipped: true
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
        selectedAnswerId: selectedAnswerId,
      });

      if (result.success && result.data) {
        setExplanation(result.data.explanation);
      } else {
        setExplanation(result.error || "Failed to load explanation.");
        toast({ title: "Explanation Error", description: result.error || "Could not generate explanation.", variant: "destructive"});
      }
    } catch (error) {
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
    // For timeout (isAnswered is true, selectedAnswerId is null), highlight correct answer in a neutral or slightly different way
    if (isAnswered && !selectedAnswerId && optionId === question.correctAnswerId) return 'border-2 border-primary ring-2 ring-primary';
    if (optionId === selectedAnswerId && optionId !== question.correctAnswerId) return ''; // Destructive variant handles styling
    return '';
  };

  const CorrectIcon = <CheckCircle2 className="mr-2 h-5 w-5" />;
  const IncorrectIcon = <XCircle className="mr-2 h-5 w-5" />;
  const TimeoutIcon = <AlertTriangle className="mr-2 h-5 w-5" />; // Used for visual indication on correct answer if timed out

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto shadow-xl transition-all duration-300 ease-in-out">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="font-headline text-2xl md:text-3xl">Question {questionNumber}/{totalQuestions}</CardTitle>
            <Timer
              key={question.id} // Key change to help reset timer state
              duration={QUESTION_DURATION}
              onTimeout={handleTimeout}
              onTick={setTimeLeft}
              isPaused={isAnswered} // isAnswered state (not ref) controls the Timer's pause
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
                // No special ring for timeout on the button itself, feedback text handles it
              )}
              onClick={() => handleAnswerClick(option.id)}
              disabled={isAnswered} // isAnswered state (not ref) controls button disable
              aria-pressed={selectedAnswerId === option.id}
            >
              {showFeedback && option.id === selectedAnswerId && option.id === question.correctAnswerId && CorrectIcon}
              {showFeedback && option.id === selectedAnswerId && option.id !== question.correctAnswerId && IncorrectIcon}
              {/* Icon for correct answer if timed out (shown on the correct option button) */}
              {showFeedback && isAnswered && !selectedAnswerId && option.id === question.correctAnswerId && TimeoutIcon}
              {option.text}
            </Button>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-4 space-y-4">
          {showFeedback && selectedAnswerId && selectedAnswerId !== question.correctAnswerId && (
            <p className="text-destructive text-center font-medium">
              Correct answer: {question.options.find(opt => opt.id === question.correctAnswerId)?.text}
            </p>
          )}
          {showFeedback && isAnswered && !selectedAnswerId && (
             <p className="text-destructive text-center font-medium">
              Time's up! The correct answer was: {question.options.find(opt => opt.id === question.correctAnswerId)?.text}
            </p>
          )}

          {/* Auto-advance countdown message */}
          {isAnswered && selectedAnswerId === question.correctAnswerId && autoAdvanceMessage && (
            <p className="text-sm text-muted-foreground">{autoAdvanceMessage}</p>
          )}

          {showFeedback && (
            <Button
              variant="outline"
              className="w-full md:w-auto"
              onClick={handleShowExplanation}
              disabled={isExplanationLoading}
            >
              {isExplanationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              Show Explanation
            </Button>
          )}

          {isAnswered && ( // Show "Next" button if any answer was made or if it timed out
            <Button onClick={() => {
              // If user clicks next manually, clear auto-advance and visual timers
              if (autoAdvanceTimerRef.current) {
                clearTimeout(autoAdvanceTimerRef.current);
                autoAdvanceTimerRef.current = null;
              }
              if (visualCountdownTimerRef.current) {
                clearInterval(visualCountdownTimerRef.current);
                visualCountdownTimerRef.current = null;
              }
              setAutoAdvanceMessage(null); // Reset message
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
          <AlertDialogDescription className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap py-2">
            {isExplanationLoading && <span className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="ml-2">Generating explanation...</span></span>}
            {!isExplanationLoading && explanation}
            {!isExplanationLoading && !explanation && "No explanation available or an error occurred."}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowExplanationDialog(false)} disabled={isExplanationLoading}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
 