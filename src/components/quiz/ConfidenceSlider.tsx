"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ConfidenceLevel } from '@/types';
import { Brain, HelpCircle, ThumbsUp, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfidenceSliderProps {
    onSubmit: (confidence: ConfidenceLevel) => void;
    isCorrect: boolean;
    isSubmitting?: boolean;
}

const CONFIDENCE_OPTIONS = [
    {
        value: ConfidenceLevel.GUESS,
        label: 'Guess',
        description: 'Complete guess',
        icon: HelpCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500',
    },
    {
        value: ConfidenceLevel.UNSURE,
        label: 'Unsure',
        description: 'Somewhat unsure',
        icon: Brain,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500',
    },
    {
        value: ConfidenceLevel.SURE,
        label: 'Sure',
        description: 'Pretty sure',
        icon: ThumbsUp,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500',
    },
    {
        value: ConfidenceLevel.KNEW_IT,
        label: 'Knew It',
        description: 'Definitely knew it',
        icon: Sparkles,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500',
    },
];

export function ConfidenceSlider({ onSubmit, isCorrect, isSubmitting = false }: ConfidenceSliderProps) {
    const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel>(
        ConfidenceLevel.SURE
    );

    const handleSliderChange = (value: number[]) => {
        setSelectedConfidence(value[0] as ConfidenceLevel);
    };

    const handleSubmit = () => {
        onSubmit(selectedConfidence);
    };

    const selectedOption = CONFIDENCE_OPTIONS.find(opt => opt.value === selectedConfidence);
    const Icon = selectedOption?.icon || Brain;

    return (
        <Card className="w-full border-2">
            <CardContent className="pt-6 space-y-4">
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">
                        How confident were you?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {isCorrect
                            ? "This helps us schedule when to review this question again."
                            : "This helps us understand your learning pattern."}
                    </p>
                </div>

                {/* Visual confidence display */}
                <div className={cn(
                    "flex items-center justify-center p-6 rounded-lg border-2 transition-all",
                    selectedOption?.bgColor,
                    selectedOption?.borderColor
                )}>
                    <Icon className={cn("h-12 w-12", selectedOption?.color)} />
                    <div className="ml-4 text-left">
                        <p className={cn("text-2xl font-bold", selectedOption?.color)}>
                            {selectedOption?.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {selectedOption?.description}
                        </p>
                    </div>
                </div>

                {/* Slider */}
                <div className="px-4 py-6">
                    <Slider
                        value={[selectedConfidence]}
                        onValueChange={handleSliderChange}
                        min={1}
                        max={4}
                        step={1}
                        className="w-full"
                    />

                    {/* Labels */}
                    <div className="flex justify-between mt-3 px-1">
                        {CONFIDENCE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSelectedConfidence(option.value)}
                                className={cn(
                                    "text-xs font-medium transition-colors cursor-pointer hover:opacity-100",
                                    selectedConfidence === option.value
                                        ? cn(option.color, "opacity-100")
                                        : "text-muted-foreground opacity-60"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit button */}
                <Button
                    onClick={handleSubmit}
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Continue'
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
