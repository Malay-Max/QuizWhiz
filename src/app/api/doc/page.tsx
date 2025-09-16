
"use client";

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { Loader2 } from 'lucide-react';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { 
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Loading API Docs...</p>
        </div>
    )
});

export default function ApiDocPage() {
  return <SwaggerUI url="/api/doc/openapi.json" />;
}
