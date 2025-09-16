"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, BookOpen } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const CodeBlock = ({ children }: { children: React.ReactNode }) => (
  <pre className="bg-muted p-4 rounded-md text-sm font-code overflow-x-auto">
    <code>{children}</code>
  </pre>
);

const Endpoint = ({ method, path, description }: { method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, description: string }) => {
  const methodColor = {
    GET: 'text-blue-500',
    POST: 'text-green-500',
    PUT: 'text-yellow-500',
    DELETE: 'text-red-500',
  }[method];

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-lg">
        <span className={`${methodColor} font-bold mr-2`}>{method}</span>
        <code className="font-code">{path}</code>
      </h4>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  );
};


export default function ApiDocumentationPage() {
  return (
    <div className="container mx-auto py-8 prose prose-lg dark:prose-invert max-w-4xl">
      <div className="flex items-center mb-6">
        <BookOpen className="h-10 w-10 mr-3 text-primary" />
        <h1 className="font-headline text-4xl m-0">API Documentation for MCP Server Integration</h1>
      </div>

      <p className="text-muted-foreground">
        This document provides instructions on how to integrate an external server (like an MCP server)
        with the QuizCraft API. It covers authentication, available endpoints, and data formats.
      </p>

      <Separator className="my-8" />

      <section>
        <h2 id="authentication">Authentication</h2>
        <p>
          All API endpoints under the <code className="font-code">/api/</code> path are protected. To access them, the client must include a valid Firebase Authentication ID token in the `Authorization` header of every request.
        </p>
        <p>
          The header must be in the following format:
        </p>
        <CodeBlock>
          Authorization: Bearer &lt;FIREBASE_ID_TOKEN&gt;
        </CodeBlock>
        <p>
          Your MCP server will need to authenticate a user with Firebase (e.g., using a service account or custom token) to obtain a valid ID token. This token is then used to make secure calls on behalf of that user.
        </p>
      </section>

      <Separator className="my-8" />

      <section>
        <h2 id="endpoints">API Endpoints</h2>
        <p>The base URL for all API endpoints is the root of this application.</p>
        
        <Card className="my-6">
            <CardHeader>
                <CardTitle id="categories-api">Categories API</CardTitle>
            </CardHeader>
            <CardContent>
                <Endpoint method="GET" path="/api/categories" description="Retrieves a list of all categories. Use ?format=tree for a hierarchical view." />
                <Endpoint method="POST" path="/api/categories" description="Creates a new category. Body: { name: string, parentId?: string | null }" />
                <Endpoint method="GET" path="/api/categories/{categoryId}" description="Retrieves a single category by its ID." />
                <Endpoint method="PUT" path="/api/categories/{categoryId}" description="Updates a category's name. Body: { name: string }" />
                <Endpoint method="DELETE" path="/api/categories/{categoryId}" description="Deletes a category, its sub-categories, and all associated questions." />
            </CardContent>
        </Card>

        <Card className="my-6">
            <CardHeader>
                <CardTitle id="questions-api">Questions API</CardTitle>
            </CardHeader>
            <CardContent>
                <Endpoint method="POST" path="/api/categories/{categoryId}/questions" description="Adds a new question to a category. See `CreateQuestionInputSchema` in `src/types/index.ts` for body." />
                <Endpoint method="GET" path="/api/categories/{categoryId}/questions" description="Gets questions for a category. Use ?includeSubcategories=true to include all descendants." />
                <Endpoint method="GET" path="/api/questions/{questionId}" description="Retrieves a single question by its ID." />
                <Endpoint method="PUT" path="/api/questions/{questionId}" description="Updates a question. See `UpdateQuestionInputSchema` in `src/types/index.ts` for body." />
                <Endpoint method="DELETE" path="/api/questions/{questionId}" description="Deletes a single question by its ID." />
            </CardContent>
        </Card>

        <Card className="my-6">
            <CardHeader>
                <CardTitle id="batch-ai-api">Batch & AI API</CardTitle>
            </CardHeader>
            <CardContent>
                <Endpoint method="POST" path="/api/categories/{categoryId}/questions/batch" description="Batch-adds questions from a formatted text block. Body: { text: string }" />
                <Endpoint method="GET" path="/api/categories/{categoryId}/questions/export" description="Exports all questions from a category (and its sub-categories) into a text format." />
                <Endpoint method="POST" path="/api/ai/suggest-distractors" description="Suggests incorrect answer options (distractors) for a given question and correct answer." />
            </CardContent>
        </Card>

        <Card className="my-6">
            <CardHeader>
                <CardTitle id="quiz-api">Quiz Session API</CardTitle>
            </CardHeader>
            <CardContent>
                <Endpoint method="POST" path="/api/quizzes" description="Starts a new quiz session. Body: { categoryId?: string, random?: boolean, questionCount?: number }" />
                <Endpoint method="GET" path="/api/quizzes/{quizId}" description="Retrieves the current status of an active quiz session." />
                <Endpoint method="POST" path="/api/quizzes/{quizId}/answer" description="Submits an answer for the current question in the session. Body: { questionId: string, selectedAnswerId: string }" />
                <Endpoint method="POST" path="/api/quizzes/{quizId}/pause" description="Pauses an active quiz session." />
                <Endpoint method="POST" path="/api/quizzes/{quizId}/resume" description="Resumes a paused quiz session." />
                <Endpoint method="GET" path="/api/quizzes/{quizId}/results" description="Retrieves the final results for a completed quiz session." />
            </CardContent>
        </Card>
      </section>

    </div>
  );
}