
"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Wand2, Loader2 } from 'lucide-react';
import { addQuestion, getTags } from '@/lib/storage';
import type { Question } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { generateDistractorsAction } from '@/app/actions';

const answerOptionSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  text: z.string().min(1, 'Answer option cannot be empty'),
});

const questionFormSchema = z.object({
  text: z.string().min(5, 'Question text must be at least 5 characters'),
  options: z.array(answerOptionSchema).min(2, 'At least 2 answer options are required').max(6, 'Maximum 6 answer options allowed'),
  correctAnswerId: z.string().min(1,'Please select a correct answer'),
  tags: z.string().min(1, 'At least one tag is required'),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

const defaultAnswerOptions = Array(2).fill(null).map(() => ({ id: crypto.randomUUID(), text: '' }));

export function QuestionForm() {
  const { toast } = useToast();
  const [isGeneratingDistractors, setIsGeneratingDistractors] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      text: '',
      options: defaultAnswerOptions,
      correctAnswerId: '',
      tags: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  useEffect(() => {
    setAvailableTags(getTags());
  }, []);

  const watchQuestionText = form.watch('text');
  const watchCorrectAnswerId = form.watch('correctAnswerId');
  const watchOptions = form.watch('options');

  const canGenerateDistractors = watchQuestionText.length >= 5 && 
                                 watchCorrectAnswerId &&
                                 watchOptions.find(opt => opt.id === watchCorrectAnswerId)?.text.length > 0;

  const handleAddOption = () => {
    if (fields.length < 6) {
      append({ id: crypto.randomUUID(), text: '' });
    } else {
      toast({
        title: "Limit Reached",
        description: "You can add a maximum of 6 answer options.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveOption = (index: number) => {
    const removedOptionId = fields[index].id;
    if (form.getValues('correctAnswerId') === removedOptionId) {
      form.setValue('correctAnswerId', ''); 
    }
    remove(index);
  };
  
  const handleTagClick = (tag: string) => {
    const currentTagsValue = form.getValues('tags');
    const currentTagsArray = currentTagsValue.split(',').map(t => t.trim()).filter(t => t);
    if (!currentTagsArray.includes(tag)) {
      currentTagsArray.push(tag);
      form.setValue('tags', currentTagsArray.join(', '), { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleGenerateDistractors = async () => {
    if (!canGenerateDistractors) return;

    const questionText = form.getValues('text');
    const correctAnswerId = form.getValues('correctAnswerId');
    const options = form.getValues('options');
    const correctAnswerOption = options.find(opt => opt.id === correctAnswerId);

    if (!correctAnswerOption || !correctAnswerOption.text) {
      toast({
        title: "Missing Information",
        description: "Please ensure the correct answer text is filled.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingDistractors(true);
    try {
      const numDistractorsToGenerate = Math.max(0, 3 - (options.length -1)); 
      
      if (numDistractorsToGenerate <= 0 && options.length >= 4) {
         toast({
            title: "Sufficient Options",
            description: "You already have enough answer options.",
          });
        setIsGeneratingDistractors(false);
        return;
      }

      const result = await generateDistractorsAction({
        question: questionText,
        correctAnswer: correctAnswerOption.text,
        numDistractors: numDistractorsToGenerate > 0 ? numDistractorsToGenerate : 3, 
      });

      if (result.success && result.data) {
        const distractors = result.data.distractors;
        
        let currentOptions = form.getValues('options');
        const correctAnswer = currentOptions.find(opt => opt.id === correctAnswerId);
        let newOptions = correctAnswer ? [correctAnswer] : [];
        
        distractors.forEach(distractorText => {
          if (newOptions.length < 6) { 
            newOptions.push({ id: crypto.randomUUID(), text: distractorText });
          }
        });
        
        const currentFieldLength = fields.length;
        while (newOptions.length < Math.min(6, Math.max(2, currentFieldLength, newOptions.length + numDistractorsToGenerate)) && newOptions.length < 6) {
           if (newOptions.length < options.length) { 
             const existingNonDistractorOption = options.find(opt => opt.id !== correctAnswerId && !newOptions.find(no => no.id === opt.id) && opt.text.trim() !== "");
             if (existingNonDistractorOption) newOptions.push(existingNonDistractorOption);
             else newOptions.push({ id: crypto.randomUUID(), text: '' });
           } else {
             newOptions.push({ id: crypto.randomUUID(), text: '' });
           }
        }
        
        form.setValue('options', newOptions.slice(0,6), { shouldValidate: true, shouldDirty: true });

        toast({
          title: "Distractors Generated",
          description: "Review and adjust the generated answer options.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Could not generate distractors.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while generating distractors.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDistractors(false);
    }
  };

  const onSubmit = (data: QuestionFormData) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      text: data.text,
      options: data.options.map(opt => ({ id: opt.id, text: opt.text })),
      correctAnswerId: data.correctAnswerId,
      tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
    };
    addQuestion(newQuestion);
    setAvailableTags(getTags()); // Refresh available tags
    toast({
      title: 'Question Added!',
      description: 'Your new question has been saved.',
      variant: 'default',
      className: 'bg-accent text-accent-foreground'
    });
    form.reset({
      text: '',
      options: Array(2).fill(null).map(() => ({ id: crypto.randomUUID(), text: '' })),
      correctAnswerId: '',
      tags: ''
    });
  };
  
  useEffect(() => {
    const currentCorrectId = form.getValues('correctAnswerId');
    if (currentCorrectId && !form.getValues('options').find(opt => opt.id === currentCorrectId)) {
      form.setValue('correctAnswerId', '');
    }
  }, [watchOptions, form]);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Add New Question</CardTitle>
        <CardDescription>Fill in the details for your multiple-choice question.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="text" className="text-lg">Question Text</Label>
            <Textarea
              id="text"
              {...form.register('text')}
              className="mt-1 min-h-[100px] text-base"
              aria-invalid={form.formState.errors.text ? "true" : "false"}
            />
            {form.formState.errors.text && <p className="text-sm text-destructive mt-1">{form.formState.errors.text.message}</p>}
          </div>

          <div className="space-y-4">
            <Label className="text-lg">Answer Options</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...form.register(`options.${index}.text`)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-grow text-base"
                  aria-label={`Answer option ${index + 1}`}
                  aria-invalid={form.formState.errors.options?.[index]?.text ? "true" : "false"}
                />
                {fields.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOption(index)} aria-label={`Remove option ${index + 1}`}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {form.formState.errors.options?.root && <p className="text-sm text-destructive mt-1">{form.formState.errors.options.root.message}</p>}
            {form.formState.errors.options?.map((error, index) => error?.text && <p key={index} className="text-sm text-destructive mt-1">{error.text.message}</p>)}

            <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" onClick={handleAddOption} disabled={fields.length >= 6}>
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Option
                </Button>
                 <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateDistractors}
                    disabled={!canGenerateDistractors || isGeneratingDistractors || fields.length >=6 }
                  >
                    {isGeneratingDistractors ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                    Suggest Distractors
                  </Button>
            </div>
            {fields.length >= 6 && <p className="text-sm text-muted-foreground mt-1">Maximum of 6 options reached.</p>}
          </div>
          
          <div>
            <Label className="text-lg">Correct Answer</Label>
            <Controller
              control={form.control}
              name="correctAnswerId"
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="mt-2 space-y-2"
                  aria-invalid={form.formState.errors.correctAnswerId ? "true" : "false"}
                >
                  {form.getValues('options').map((option, index) => (
                    option.text.trim() && ( 
                    <div key={option.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                      <Label htmlFor={`option-${option.id}`} className="flex-grow cursor-pointer">{option.text || `Option ${index + 1}`}</Label>
                    </div>
                    )
                  ))}
                </RadioGroup>
              )}
            />
            {form.formState.errors.correctAnswerId && <p className="text-sm text-destructive mt-1">{form.formState.errors.correctAnswerId.message}</p>}
          </div>

          <div>
            <Label htmlFor="tags" className="text-lg">Tags (comma-separated)</Label>
            <Input
              id="tags"
              {...form.register('tags')}
              placeholder="e.g., science, history, fun-facts"
              className="mt-1 text-base"
              aria-invalid={form.formState.errors.tags ? "true" : "false"}
            />
            {form.formState.errors.tags && <p className="text-sm text-destructive mt-1">{form.formState.errors.tags.message}</p>}
             {availableTags.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">Frequently used tags:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableTags.map(tag => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTagClick(tag)}
                      className="text-xs px-2 py-1 h-auto"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <CardFooter className="px-0 pt-6">
            <Button type="submit" size="lg" className="w-full text-lg shadow-md" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Add Question
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
