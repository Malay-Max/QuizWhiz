
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
import { PlusCircle, Trash2, Wand2, Loader2, Folder, FileText } from 'lucide-react';
import { addQuestion, getCategories, getQuestionById, updateQuestion } from '@/lib/storage';
import type { Question, AnswerOption as QuestionAnswerOptionType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { generateDistractorsAction } from '@/app/actions';
import { useSearchParams, useRouter } from 'next/navigation';

const answerOptionSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  text: z.string().min(1, 'Answer option cannot be empty'),
});

const questionFormSchema = z.object({
  text: z.string().min(5, 'Question text must be at least 5 characters'),
  options: z.array(answerOptionSchema).min(2, 'At least 2 answer options are required').max(6, 'Maximum 6 answer options allowed'),
  correctAnswerId: z.string().min(1,'Please select a correct answer'),
  category: z.string().min(1, 'Category is required. Use / to create subcategories (e.g., Science/Physics).'),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

const defaultAnswerOptions = Array(2).fill(null).map(() => ({ id: crypto.randomUUID(), text: '' }));

export function QuestionForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isGeneratingDistractors, setIsGeneratingDistractors] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  const [batchInput, setBatchInput] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState('Add New Question');
  const [submitButtonText, setSubmitButtonText] = useState('Add Single Question');

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      text: '',
      options: defaultAnswerOptions.map(opt => ({...opt})),
      correctAnswerId: '',
      category: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const fetchAndSetLimitedCategories = async () => {
    const allCats = await getCategories(); // Returns all unique, sorted categories
    setAvailableCategories(allCats.slice(-3)); // Take the last 3
  };

  useEffect(() => {
    fetchAndSetLimitedCategories();
  }, []);

  useEffect(() => {
    const editId = searchParams.get('editId');
    const loadQuestionForEditing = async (id: string) => {
        const questionToEdit = await getQuestionById(id);
        if (questionToEdit) {
            setEditingQuestionId(id);
            const optionsWithFreshIds = questionToEdit.options.map(opt => ({...opt}));
            form.reset({ ...questionToEdit, options: optionsWithFreshIds });
            setPageTitle('Edit Question');
            setSubmitButtonText('Update Question');
        } else {
            toast({ title: "Error", description: "Question not found for editing.", variant: "destructive" });
            router.replace('/add-question', { scroll: false });
        }
    };

    if (editId) {
        loadQuestionForEditing(editId);
    } else {
        if (editingQuestionId) {
             form.reset({
                text: '',
                options: defaultAnswerOptions.map(opt => ({...opt})),
                correctAnswerId: '',
                category: '',
            });
        }
        setEditingQuestionId(null);
        setPageTitle('Add New Question');
        setSubmitButtonText('Add Single Question');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, toast]); 


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
  
  const handleCategoryClick = (category: string) => {
    form.setValue('category', category, { shouldValidate: true, shouldDirty: true });
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
          title: "Error Generating Distractors",
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

  const onSubmit = async (data: QuestionFormData) => {
    let result;
    if (editingQuestionId) {
        const updatedQuestionData: Question = {
            id: editingQuestionId,
            text: data.text,
            options: data.options.map(opt => ({ id: opt.id, text: opt.text })),
            correctAnswerId: data.correctAnswerId,
            category: data.category.trim().replace(/\s*\/\s*/g, '/'),
        };
        result = await updateQuestion(updatedQuestionData);
        if (result.success) {
            toast({
                title: 'Question Updated!',
                description: 'Your question has been successfully updated.',
                variant: 'default',
                className: 'bg-accent text-accent-foreground'
            });
            await fetchAndSetLimitedCategories();
            router.replace('/add-question', { scroll: false }); 
        } else {
            toast({
                title: 'Update Failed',
                description: result.error || 'Could not update question.',
                variant: 'destructive',
            });
        }
    } else {
        const newQuestionData: Omit<Question, 'id'> = {
            text: data.text,
            options: data.options.map(opt => ({ id: opt.id, text: opt.text })),
            correctAnswerId: data.correctAnswerId,
            category: data.category.trim().replace(/\s*\/\s*/g, '/'), 
        };
        result = await addQuestion(newQuestionData);
        if (result.success) {
            toast({
                title: 'Question Added!',
                description: 'Your new question has been saved.',
                variant: 'default',
                className: 'bg-accent text-accent-foreground'
            });
            await fetchAndSetLimitedCategories();
            form.reset({
                text: '',
                options: defaultAnswerOptions.map(opt => ({...opt})),
                correctAnswerId: '',
                category: data.category // Keep category for subsequent adds
            });
        } else {
            toast({
                title: 'Add Failed',
                description: result.error || 'Could not add question.',
                variant: 'destructive',
            });
        }
    }
  };
  
  useEffect(() => {
    const currentCorrectId = form.getValues('correctAnswerId');
    if (currentCorrectId && !form.getValues('options').find(opt => opt.id === currentCorrectId)) {
      form.setValue('correctAnswerId', '');
    }
  }, [watchOptions, form]);

  const handleBatchInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBatchInput(e.target.value);
  };

  const handleProcessBatch = async () => {
    const categoryValue = form.getValues('category');
    if (!categoryValue.trim()) {
      toast({
        title: 'Category Required',
        description: 'Please enter a category in the form above before processing batch questions.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingBatch(true);
    const lines = batchInput.split('\n').filter(line => line.trim() !== '');
    let questionsAddedCount = 0;
    let questionsFailedCount = 0;
    let permissionErrorOccurred = false;

    for (const line of lines) { 
      try {
        const questionMatch = line.match(/;;(.*?);;/);
        const optionsMatch = line.match(/\{(.*?)\}/);
        const correctMatch = line.match(/\[(.*?)\]/);

        if (!questionMatch || !optionsMatch || !correctMatch) {
          console.warn(`Skipping malformed line: ${line}`);
          questionsFailedCount++;
          continue;
        }

        const questionText = questionMatch[1].trim();
        const optionTexts = optionsMatch[1].split('-').map(opt => opt.trim()).filter(opt => opt);
        const correctAnswerText = correctMatch[1].trim();

        if (!questionText || optionTexts.length < 2 || !correctAnswerText) {
          console.warn(`Skipping invalid data in line: ${line}`);
          questionsFailedCount++;
          continue;
        }

        const answerOptions: QuestionAnswerOptionType[] = optionTexts.map(text => ({
          id: crypto.randomUUID(),
          text: text,
        }));

        const correctOption = answerOptions.find(opt => opt.text === correctAnswerText);
        if (!correctOption) {
          console.warn(`Correct answer text "${correctAnswerText}" not found in options for line: ${line}`);
          questionsFailedCount++;
          continue;
        }

        const newQuestionData: Omit<Question, 'id'> = {
          text: questionText,
          options: answerOptions,
          correctAnswerId: correctOption.id,
          category: categoryValue.trim().replace(/\s*\/\s*/g, '/'),
        };

        const result = await addQuestion(newQuestionData);
        if (result.success) {
            questionsAddedCount++;
        } else {
            questionsFailedCount++;
            console.error(`Failed to add question from line: ${line}. Error: ${result.error}`);
            if (result.error?.toLowerCase().includes('permission denied') || result.error?.toLowerCase().includes('insufficient permissions')) {
                permissionErrorOccurred = true;
            }
        }
      } catch (e) { 
        console.error(`Error processing line: ${line}`, e);
        questionsFailedCount++;
      }
    }

    setIsProcessingBatch(false);

    let finalToastTitle = 'Batch Processing Complete';
    let finalToastVariant: "default" | "destructive" = 'default';
    let finalToastClassName = 'bg-accent text-accent-foreground';
    let finalToastDescription = `${questionsAddedCount} questions added.`;
    if (questionsFailedCount > 0) {
        finalToastDescription += ` ${questionsFailedCount} failed.`;
        finalToastVariant = 'destructive';
        finalToastClassName = ''; 
    }
    if (permissionErrorOccurred) {
        finalToastDescription += ' Some operations failed due to insufficient permissions.';
        finalToastVariant = 'destructive';
    }
    if (questionsAddedCount === 0 && questionsFailedCount > 0) {
        finalToastTitle = 'Batch Processing Failed';
    }
     if (questionsAddedCount === 0 && questionsFailedCount === 0 && lines.length > 0) {
        finalToastTitle = 'No Valid Questions Processed';
        finalToastDescription = 'The batch input did not contain any valid questions or all lines had errors.';
        finalToastVariant = 'default'; 
        finalToastClassName = '';
    } else if (lines.length === 0) {
        finalToastTitle = 'No Questions Processed';
        finalToastDescription = 'The batch input was empty.';
        finalToastVariant = 'default';
        finalToastClassName = '';
    }

    toast({
        title: finalToastTitle,
        description: finalToastDescription,
        variant: finalToastVariant,
        className: finalToastClassName
    });

    if (questionsAddedCount > 0) {
      setBatchInput(''); 
      await fetchAndSetLimitedCategories();
    }
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">{pageTitle}</CardTitle>
        <CardDescription>
            {editingQuestionId ? "Modify the details of this question." : "Fill in the details for your multiple-choice question, or use the batch add feature below."}
        </CardDescription>
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

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Button type="button" variant="outline" onClick={handleAddOption} disabled={fields.length >= 6} className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Option
                </Button>
                 <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateDistractors}
                    disabled={!canGenerateDistractors || isGeneratingDistractors || fields.length >=6 }
                    className="w-full sm:w-auto"
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
            <Label htmlFor="category" className="text-lg">Category (for single & batch)</Label>
            <Input
              id="category"
              {...form.register('category')}
              placeholder="e.g., Science or TopFolder/SubFolder"
              className="mt-1 text-base"
              aria-invalid={form.formState.errors.category ? "true" : "false"}
            />
            {form.formState.errors.category && <p className="text-sm text-destructive mt-1">{form.formState.errors.category.message}</p>}
             {availableCategories.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">Existing categories (click to use):</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableCategories.map(cat => (
                    <Button
                      key={cat}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategoryClick(cat)}
                      className="text-xs px-2 py-1 h-auto"
                      title={`Use category: ${cat}`}
                    >
                      <Folder className="mr-1.5 h-3 w-3" />
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <CardFooter className="px-0 pt-6">
            <Button type="submit" size="lg" className="w-full text-lg shadow-md" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {submitButtonText}
            </Button>
          </CardFooter>
        </form>

        {!editingQuestionId && (
            <div className="mt-10 pt-6 border-t">
            <div className="flex items-center mb-3">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                <h3 className="text-xl font-semibold">Batch Add Questions</h3>
            </div>
            <p className="text-sm text-muted-foreground">
                Format: <code className="font-code bg-muted px-1 py-0.5 rounded text-xs">;;Question Text;; {'{OptionA - OptionB - OptionC}'} [Correct Option Text]</code>
            </p>
            <p className="text-sm text-muted-foreground mb-1">
                Enter one question per line. Uses the category specified above.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
                Example: <code className="font-code bg-muted px-1 py-0.5 rounded">;;What is 2+2?;; {'{Three - Four - Five}'} [Four]</code>
            </p>
            <Textarea
                value={batchInput}
                onChange={handleBatchInputChange}
                placeholder=";;What is the capital of France?;; {Paris - London - Rome} [Paris]\n;;Which planet is known as the Red Planet?;; {Earth - Mars - Jupiter} [Mars]"
                className="min-h-[150px] text-sm font-code"
                disabled={isProcessingBatch}
                aria-label="Batch question input"
            />
            <Button 
                onClick={handleProcessBatch} 
                className="mt-4 w-full sm:w-auto" 
                disabled={isProcessingBatch || !batchInput.trim() || !form.getValues('category').trim()}
            >
                {isProcessingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Process Batch Questions
            </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

    