
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Wand2, Loader2, Folder, FileText, Copy } from 'lucide-react';
import { 
  getQuestionById, 
  updateQuestion, 
  getAllCategories,
  getFullCategoryPath,
  Category as CategoryType,
  Question as QuestionType,
  getQuestionsByCategoryIdAndDescendants
} from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { generateDistractorsAction } from '@/app/actions';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const answerOptionSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  text: z.string().min(1, 'Answer option cannot be empty'),
});

const questionFormSchema = z.object({
  text: z.string().min(5, 'Question text must be at least 5 characters'),
  options: z.array(answerOptionSchema).min(2, 'At least 2 answer options are required').max(6, 'Maximum 6 answer options allowed'),
  correctAnswerId: z.string().min(1,'Please select a correct answer'),
  categoryId: z.string().min(1, 'Category is required.'),
  explanation: z.string().optional(),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

const defaultAnswerOptions = Array(2).fill(null).map(() => ({ id: crypto.randomUUID(), text: '' }));

const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl sm:text-3xl font-bold my-3 sm:my-4" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl sm:text-2xl font-semibold my-2 sm:my-3" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg sm:text-xl font-semibold my-1 sm:my-2" {...props} />,
    p: ({node, ...props}: any) => <p className="text-lg sm:text-xl mb-2 leading-relaxed" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-lg sm:text-xl" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-lg sm:text-xl" {...props} />,
    li: ({node, ...props}: any) => <li className="text-lg sm:text-xl leading-relaxed" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold" {...props} />,
    em: ({node, ...props}: any) => <em className="italic" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <pre className={cn("p-2 my-2 bg-muted rounded-md overflow-x-auto font-code text-xs sm:text-sm", className)} {...props}>
          <code>{String(children).replace(/\n$/, '')}</code>
        </pre>
      ) : (
        <code className={cn("px-1 py-0.5 bg-muted rounded font-code text-xs sm:text-sm", className)} {...props}>
          {children}
        </code>
      )
    },
  };
  
const optionMarkdownComponents = { 
    h1: ({node, ...props}: any) => <h1 className="text-xl sm:text-2xl font-bold my-1 text-inherit" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-lg sm:text-xl font-semibold my-1 text-inherit" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-base sm:text-lg font-semibold my-0.5 text-inherit" {...props} />,
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

interface CategoryOption {
  id: string;
  name: string; 
}

export function QuestionForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isGeneratingDistractors, setIsGeneratingDistractors] = useState(false);
  const [allCategories, setAllCategories] = useState<CategoryType[]>([]);
  const [categoryOptionsForSelect, setCategoryOptionsForSelect] = useState<CategoryOption[]>([]);
  
  // State for category search
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [filteredCategorySuggestions, setFilteredCategorySuggestions] = useState<CategoryOption[]>([]);

  const [batchInput, setBatchInput] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState('Add New Question');
  const [submitButtonText, setSubmitButtonText] = useState('Add Single Question');

  const [exportCategorySearchTerm, setExportCategorySearchTerm] = useState<string>('');
  const [filteredExportCategorySuggestions, setFilteredExportCategorySuggestions] = useState<CategoryOption[]>([]);
  const [categoryForExport, setCategoryForExport] = useState<CategoryOption | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedQuestionsText, setExportedQuestionsText] = useState<string>('');

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      text: '',
      options: defaultAnswerOptions.map(opt => ({...opt})),
      correctAnswerId: '',
      categoryId: '',
      explanation: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const refreshAllCategories = useCallback(async () => {
    const cats = await getAllCategories();
    setAllCategories(cats);
    const options = cats.map(cat => ({
      id: cat.id,
      name: getFullCategoryPath(cat.id, cats) || cat.name, 
    })).sort((a,b) => a.name.localeCompare(b.name));
    setCategoryOptionsForSelect(options);
  }, []);

  useEffect(() => {
    refreshAllCategories();
  }, [refreshAllCategories]);
  
  const watchCategoryId = form.watch('categoryId');

  useEffect(() => {
    if (watchCategoryId) {
      const selectedCategory = categoryOptionsForSelect.find(c => c.id === watchCategoryId);
      if (selectedCategory && selectedCategory.name !== categorySearchTerm) {
        setCategorySearchTerm(selectedCategory.name);
      }
    } else if (!editingQuestionId) {
      setCategorySearchTerm('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchCategoryId, categoryOptionsForSelect]);


  useEffect(() => {
    if (categorySearchTerm && categoryOptionsForSelect.some(opt => opt.name === categorySearchTerm)) {
      setFilteredCategorySuggestions([]);
      return;
    }

    if (categorySearchTerm.trim() !== '') {
      const lowercasedInput = categorySearchTerm.toLowerCase();
      const suggestions = categoryOptionsForSelect
        .filter(catOpt => catOpt.name.toLowerCase().includes(lowercasedInput))
        .slice(0, 5);
      setFilteredCategorySuggestions(suggestions);
    } else {
      setFilteredCategorySuggestions([]);
    }
  }, [categorySearchTerm, categoryOptionsForSelect]);

  const handleCategorySuggestionClick = (categoryOpt: CategoryOption) => {
    form.setValue('categoryId', categoryOpt.id, { shouldValidate: true });
    setCategorySearchTerm(categoryOpt.name);
    setFilteredCategorySuggestions([]);
  };

  useEffect(() => {
    if (exportCategorySearchTerm && exportCategorySearchTerm.trim() !== '') {
      const lowercasedInput = exportCategorySearchTerm.toLowerCase();
      const suggestions = categoryOptionsForSelect
        .filter(catOpt => catOpt.name.toLowerCase().includes(lowercasedInput))
        .slice(0, 5);
      setFilteredExportCategorySuggestions(suggestions);
    } else {
      setFilteredExportCategorySuggestions([]);
    }
    if (categoryForExport && categoryForExport.name !== exportCategorySearchTerm) {
        setCategoryForExport(null); 
    }
    setExportedQuestionsText(''); 
  }, [exportCategorySearchTerm, categoryOptionsForSelect, categoryForExport]);

  useEffect(() => {
    const editId = searchParams.get('editId');
    const loadQuestionForEditing = async (id: string) => {
        const questionToEdit = await getQuestionById(id);
        if (questionToEdit) {
            setEditingQuestionId(id);
            const optionsWithFreshIds = questionToEdit.options.map(opt => ({...opt}));
            form.reset({ 
              text: questionToEdit.text,
              options: optionsWithFreshIds,
              correctAnswerId: questionToEdit.correctAnswerId,
              categoryId: questionToEdit.categoryId,
              explanation: questionToEdit.explanation || '',
            });
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
                categoryId: '',
                explanation: '',
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

  const handleExportCategorySuggestionClick = (categoryOpt: CategoryOption) => {
    setCategoryForExport(categoryOpt);
    setExportCategorySearchTerm(categoryOpt.name); 
    setFilteredExportCategorySuggestions([]);
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
        const updatedQuestionData: QuestionType = { 
            id: editingQuestionId,
            text: data.text,
            options: data.options.map(opt => ({ id: opt.id, text: opt.text })),
            correctAnswerId: data.correctAnswerId,
            categoryId: data.categoryId,
            explanation: data.explanation,
        };
        result = await updateQuestion(updatedQuestionData);
        if (result.success) {
            toast({
                title: 'Question Updated!',
                description: 'Your question has been successfully updated.',
                variant: 'default',
                className: 'bg-accent text-accent-foreground'
            });
            await refreshAllCategories();
            router.replace('/add-question', { scroll: false }); 
        } else {
            toast({
                title: 'Update Failed',
                description: result.error || 'Could not update question.',
                variant: 'destructive',
            });
        }
    } else {
        const response = await fetch(`/api/categories/${data.categoryId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: data.text,
            options: data.options.map(o => o.text),
            correctAnswerText: data.options.find(o => o.id === data.correctAnswerId)?.text,
            explanation: data.explanation,
          })
        });
        const result = await response.json();

        if (result.success) {
            toast({
                title: 'Question Added!',
                description: 'Your new question has been saved.',
                variant: 'default',
                className: 'bg-accent text-accent-foreground'
            });
            form.reset({
                text: '',
                options: defaultAnswerOptions.map(opt => ({...opt})),
                correctAnswerId: '',
                categoryId: data.categoryId,
                explanation: ''
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
    const currentCategoryId = form.getValues('categoryId');
    if (!currentCategoryId) {
      toast({
        title: 'Category Required',
        description: 'Please select a category from the dropdown above before processing batch questions.',
        variant: 'destructive',
      });
      return;
    }
    
    let questionsData;
    try {
      questionsData = JSON.parse(batchInput);
    } catch (e) {
      toast({
        title: 'Invalid JSON',
        description: 'The batch input is not valid JSON. Please check the format.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingBatch(true);
    
    const response = await fetch(`/api/categories/${currentCategoryId}/questions/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionsData),
    });

    const result = await response.json();
    setIsProcessingBatch(false);

    if (response.ok) {
        toast({
            title: result.message || 'Batch Processing Complete',
            description: `${result.data.added} questions added. ${result.data.failed} failed.`,
            variant: result.data.failed > 0 ? 'default' : 'default',
            className: result.data.failed === 0 ? 'bg-accent text-accent-foreground' : ''
        });
        if (result.data.added > 0) {
            setBatchInput('');
        }
    } else {
        toast({
            title: 'Batch Processing Failed',
            description: result.error || 'An unknown error occurred.',
            variant: 'destructive',
        });
    }
  };

  const handleExportQuestions = async () => {
    if (!categoryForExport) {
      toast({ title: "No Category Selected", description: "Please select a category using the search box above to display its questions.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    setExportedQuestionsText(''); 
    try {
      const response = await fetch(`/api/categories/${categoryForExport.id}/questions/export`);
      const result = await response.json();
  
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch questions for export.');
      }
      
      const questionsToExport = result.data;
      if (!questionsToExport || questionsToExport.length === 0) {
        toast({ title: "No Questions", description: `No questions found in category "${categoryForExport.name}" or its sub-categories to display.`, variant: "default" });
        setIsExporting(false);
        return;
      }
      
      const formattedJson = JSON.stringify(questionsToExport, null, 2);
      
      setExportedQuestionsText(formattedJson);
      toast({ title: "Display Ready", description: `${questionsToExport.length} questions from "${categoryForExport.name}" and its sub-categories are displayed below for copying.`, className: 'bg-accent text-accent-foreground' });
  
    } catch (error) {
      console.error("Error preparing questions for display:", error);
      toast({ title: "Display Failed", description: "An error occurred while preparing questions for display.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!exportedQuestionsText) return;
    try {
      await navigator.clipboard.writeText(exportedQuestionsText);
      toast({ title: "Copied!", description: "Questions copied to clipboard.", className: 'bg-accent text-accent-foreground' });
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy questions to clipboard.", variant: "destructive" });
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl sm:text-3xl">{pageTitle}</CardTitle>
        <CardDescription className="text-sm sm:text-base">
            {editingQuestionId ? "Modify the details of this question." : "Fill in the details for a new question, or use batch/export features below."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="text" className="text-base sm:text-lg">Question Text</Label>
            <Textarea
              id="text"
              {...form.register('text')}
              className="mt-1 min-h-[100px] text-sm md:text-base"
              aria-invalid={form.formState.errors.text ? "true" : "false"}
            />
            {form.formState.errors.text && <p className="text-sm text-destructive mt-1">{form.formState.errors.text.message}</p>}
          </div>

          <div className="space-y-4">
            <Label className="text-base sm:text-lg">Answer Options</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...form.register(`options.${index}.text`)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-grow text-sm md:text-base"
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
                <Button type="button" variant="outline" onClick={handleAddOption} disabled={fields.length >= 6} className="w-full sm:w-auto text-sm sm:text-base">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Option
                </Button>
                 <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateDistractors}
                    disabled={!canGenerateDistractors || isGeneratingDistractors || fields.length >=6 }
                    className="w-full sm:w-auto text-sm sm:text-base"
                  >
                    {isGeneratingDistractors ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                    Suggest Distractors
                  </Button>
            </div>
            {fields.length >= 6 && <p className="text-xs sm:text-sm text-muted-foreground mt-1">Maximum of 6 options reached.</p>}
          </div>
          
          <div>
            <Label className="text-base sm:text-lg">Correct Answer</Label>
            <RadioGroup
              onValueChange={(value) => form.setValue('correctAnswerId', value, { shouldValidate: true })}
              value={form.getValues('correctAnswerId')}
              className="mt-2 space-y-2"
              aria-invalid={form.formState.errors.correctAnswerId ? "true" : "false"}
            >
              {form.getValues('options').map((option, index) => (
                option.text.trim() && ( 
                <div key={`${option.id}-radio-item`} className="flex items-start space-x-2 p-2 border rounded-md hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value={option.id} id={`${option.id}-radio`} className="mt-1 flex-shrink-0" />
                  <Label htmlFor={`${option.id}-radio`} className="flex-grow cursor-pointer font-normal">
                    <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-none text-inherit">
                        <ReactMarkdown components={optionMarkdownComponents}>
                            {option.text || `Option ${index + 1}`}
                        </ReactMarkdown>
                    </div>
                  </Label>
                </div>
                )
              ))}
            </RadioGroup>
            {form.formState.errors.correctAnswerId && <p className="text-sm text-destructive mt-1">{form.formState.errors.correctAnswerId.message}</p>}
          </div>

          <div>
            <Label htmlFor="explanation" className="text-base sm:text-lg">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              {...form.register('explanation')}
              className="mt-1 min-h-[100px] text-sm md:text-base"
              placeholder="Provide a static explanation for why the answer is correct."
            />
          </div>

          <div>
            <Label htmlFor="category-search" className="text-base sm:text-lg">Category (for single & batch)</Label>
            <Input
              id="category-search"
              value={categorySearchTerm}
              onChange={(e) => {
                setCategorySearchTerm(e.target.value);
                if (!categoryOptionsForSelect.some(c => c.name === e.target.value)) {
                  form.setValue('categoryId', '', { shouldValidate: true });
                }
              }}
              placeholder="Type to search for a category..."
              className="mt-1 text-sm md:text-base"
              autoComplete="off"
              disabled={categoryOptionsForSelect.length === 0 && !editingQuestionId}
            />
            {filteredCategorySuggestions.length > 0 && (
              <div className="mt-2 border rounded-md bg-background shadow-md p-2">
                <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
                <div className="flex flex-wrap gap-1">
                  {filteredCategorySuggestions.map(catOpt => (
                    <Button
                      key={`cat-sugg-${catOpt.id}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategorySuggestionClick(catOpt)}
                      className="text-xs px-2 py-1 h-auto whitespace-normal"
                    >
                      <Folder className="mr-1.5 h-3 w-3 shrink-0" />
                      <span className="min-w-0 break-all">{catOpt.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {categoryOptionsForSelect.length === 0 && !editingQuestionId && (
              <p className="text-xs text-muted-foreground mt-1">No categories available. Please add one via the home page.</p>
            )}
            {form.formState.errors.categoryId && <p className="text-sm text-destructive mt-1">{form.formState.errors.categoryId.message}</p>}
          </div>

          <CardFooter className="px-0 pt-6">
            <Button type="submit" size="lg" className="w-full text-base sm:text-lg shadow-md" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {submitButtonText}
            </Button>
          </CardFooter>
        </form>

        {!editingQuestionId && (
            <div className="mt-10 pt-6 border-t">
            <div className="flex items-center mb-3">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                <h3 className="text-lg sm:text-xl font-semibold">Batch Add Questions (JSON)</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Paste an array of questions in JSON format. Uses the category selected above.
            </p>
            <Textarea
                value={batchInput}
                onChange={handleBatchInputChange}
                placeholder={`[\n  {\n    "question": "What is the capital of France?",\n    "options": {\n      "A": "Paris",\n      "B": "London",\n      "C": "Rome"\n    },\n    "correctAnswer": "A",\n    "explanation": "Paris is the capital of France."\n  }\n]`}
                className="min-h-[150px] text-xs sm:text-sm font-code"
                disabled={isProcessingBatch}
                aria-label="Batch question JSON input"
            />
            <Button 
                onClick={handleProcessBatch} 
                className="mt-4 w-full sm:w-auto text-sm sm:text-base" 
                disabled={isProcessingBatch || !batchInput.trim() || !form.getValues('categoryId')}
            >
                {isProcessingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Process Batch Questions
            </Button>
            </div>
        )}

        <div className="mt-10 pt-6 border-t">
          <div className="flex items-center mb-3">
            <Folder className="h-6 w-6 mr-2 text-primary" />
            <h3 className="text-lg sm:text-xl font-semibold">Export Questions for Category</h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Search for a category, select it, then click "Export Questions" to generate a JSON array of its questions (including sub-categories) for easy copying.
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="export-category-input" className="text-base sm:text-lg">Search and Select Category</Label>
              <Input
                id="export-category-input"
                value={exportCategorySearchTerm}
                onChange={(e) => setExportCategorySearchTerm(e.target.value)}
                placeholder="Type to search category..."
                className="mt-1 text-sm md:text-base w-full"
                autoComplete="off"
              />
              {filteredExportCategorySuggestions.length > 0 && (
                <div className="mt-2 border rounded-md bg-background shadow-md p-2">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Suggestions (click to select):</p>
                  <div className="flex flex-wrap gap-1">
                    {filteredExportCategorySuggestions.map(catOpt => (
                      <Button
                        key={`export-sugg-${catOpt.id}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportCategorySuggestionClick(catOpt)}
                        className="text-xs px-2 py-1 h-auto whitespace-normal"
                        title={`Select category: ${catOpt.name}`}
                      >
                        <Folder className="mr-1.5 h-3 w-3 shrink-0" />
                        <span className="min-w-0 break-all">{catOpt.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={handleExportQuestions}
              className="w-full sm:w-auto text-sm sm:text-base"
              disabled={isExporting || !categoryForExport}
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Export Questions
            </Button>

            {exportedQuestionsText && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="exported-questions-display" className="text-base sm:text-lg">Formatted Questions (JSON):</Label>
                <Textarea
                  id="exported-questions-display"
                  value={exportedQuestionsText}
                  readOnly
                  className="min-h-[150px] text-xs sm:text-sm font-code bg-muted/50"
                  rows={10}
                  aria-label="Exported questions text"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="text-xs sm:text-sm"
                >
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copy to Clipboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
