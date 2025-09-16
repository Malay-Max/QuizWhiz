
"use client";

import { BookOpen, Server, Terminal } from 'lucide-react';
import React, { ReactNode } from 'react';

// Helper component to format endpoint documentation
const Endpoint = ({ method, path, description, children }: { method: string, path: string, description: string, children?: ReactNode }) => {
  const methodColor = {
    GET: 'text-green-500',
    POST: 'text-blue-500',
    PUT: 'text-yellow-500',
    DELETE: 'text-red-500',
  }[method] || 'text-gray-500';

  return (
    <div className="mb-8 p-4 border rounded-lg shadow-sm bg-card">
      <h3 className="font-code text-lg sm:text-xl font-bold">
        <span className={`mr-2 font-extrabold ${methodColor}`}>{method}</span>
        <span>{path}</span>
      </h3>
      <p className="mt-1 text-muted-foreground">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};


export default function ApiDocumentationPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center mb-6">
        <BookOpen className="h-10 w-10 mr-3 text-primary" />
        <h1 className="font-headline text-4xl m-0">API Documentation for MCP Server Integration</h1>
      </div>
      
      <section id="introduction" className="mb-10">
        <h2 className="font-headline text-2xl border-b pb-2 mb-4">Introduction</h2>
        <p>This document provides the necessary details for integrating an external MCP (Multiple Choice Platform) server with this Quiz application. The API is designed to be simple and follows RESTful principles.</p>
        <p>The API is currently public, meaning no authentication is required to access the endpoints. This simplifies development and testing but should be secured if sensitive data is involved.</p>
      </section>

      <section id="api-host" className="mb-10">
          <h2 className="font-headline text-2xl border-b pb-2 mb-4">Note on API Host</h2>
          <p>
              The examples below use a placeholder URL <code>https://&lt;YOUR_APP_URL&gt;</code>. 
              When making API calls, you must replace this placeholder with the actual domain of your deployed Vercel application.
          </p>
          <p>
              If you are testing on your local machine, the URL will typically be <code>http://localhost:3000</code>, as 3000 is the default port for the Next.js development server.
          </p>
      </section>

      <section id="testing" className="mb-10">
        <h2 className="font-headline text-2xl border-b pb-2 mb-4 flex items-center"><Terminal className="mr-2"/> Testing the API</h2>
        <p>You can test the public API using any HTTP client, such as <code>curl</code> from your command line.</p>
        
        <div className="mt-6">
          <h4 className="font-semibold text-lg mb-2">Example: Listing All Categories</h4>
          <p>This command fetches all question categories in a flat list.</p>
          <pre className="bg-gray-800 text-white p-3 rounded-md my-2 text-sm overflow-x-auto"><code>
{`curl https://<YOUR_APP_URL>/api/categories`}
          </code></pre>
        </div>

        <div className="mt-6">
          <h4 className="font-semibold text-lg mb-2">Example: Starting a New Quiz</h4>
          <p>This command starts a new random quiz session with 5 questions.</p>
          <pre className="bg-gray-800 text-white p-3 rounded-md my-2 text-sm overflow-x-auto"><code>
{`curl -X POST https://<YOUR_APP_URL>/api/quizzes \\
  -H "Content-Type: application/json" \\
  -d '{"random": true, "questionCount": 5}'`}
          </code></pre>
        </div>
      </section>

      <section id="endpoints">
        <h2 className="font-headline text-2xl border-b pb-2 mb-4 flex items-center"><Server className="mr-2"/> API Endpoints</h2>
        
        <Endpoint
          method="GET"
          path="/api/categories"
          description="Retrieves a list of all question categories. Use ?format=tree to get a nested structure."
        />

        <Endpoint
          method="GET"
          path="/api/categories/{categoryId}"
          description="Retrieves a single category by its ID."
        />

        <Endpoint
          method="POST"
          path="/api/categories"
          description="Creates a new category. The body must be a JSON object with a 'name' property and an optional 'parentId'."
        >
          <p>The <code>name</code> is required. The <code>parentId</code> is optional and should be the ID of an existing category if you want to create a sub-category.</p>
          <h4 className="font-semibold mt-4">Example Request:</h4>
          <pre className="bg-gray-800 text-white p-3 rounded-md my-2 text-sm overflow-x-auto"><code>
{`curl -X POST https://<YOUR_APP_URL>/api/categories \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My New Root Category", "parentId": null}'`}
          </code></pre>
          <h4 className="font-semibold mt-4">Response (Success 201)</h4>
          <pre className="bg-gray-800 text-white p-3 rounded-md my-2 text-sm overflow-x-auto"><code>
{`{
  "success": true,
  "data": {
    "id": "newly_created_category_id"
  }
}`}
          </code></pre>
        </Endpoint>
        
        <Endpoint
          method="GET"
          path="/api/categories/{categoryId}/questions"
          description="Retrieves all questions for a specific category. Use ?includeSubcategories=true to include questions from all nested sub-categories."
        />

        <Endpoint
          method="POST"
          path="/api/categories/{categoryId}/questions"
          description="Adds a new question to a specific category."
        />

        <Endpoint
          method="POST"
          path="/api/quizzes"
          description="Starts a new quiz session. The body can specify a categoryId or request a random quiz."
        />

        <Endpoint
          method="GET"
          path="/api/quizzes/{quizId}"
          description="Gets the current state of an active or paused quiz session."
        />
        
        <Endpoint
          method="POST"
          path="/api/quizzes/{quizId}/answer"
          description="Submits an answer for the current question in a quiz session."
        />

        <Endpoint
          method="GET"
          path="/api/quizzes/{quizId}/results"
          description="Retrieves the final results of a completed quiz session."
        />

      </section>
    </div>
  );
}
