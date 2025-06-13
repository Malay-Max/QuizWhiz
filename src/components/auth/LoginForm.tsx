
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { signInWithEmailPassword, isAuthenticating, authError, clearAuthError } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    clearAuthError();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    clearAuthError();
    const user = await signInWithEmailPassword(data.email, data.password);
    if (user) {
      toast({
        title: "Login Successful!",
        description: "Welcome back.",
        variant: "default",
      });
      router.push('/'); // Redirect to home page after successful login
    }
    // If user is null, authError will be set in AuthContext and displayed
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Welcome Back!</CardTitle>
        <CardDescription>Enter your credentials to log in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {authError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
              {authError}
            </div>
          )}
          <div>
            <Label htmlFor="email-login">Email</Label>
            <Input
              id="email-login"
              type="email"
              {...form.register('email')}
              className="mt-1"
              placeholder="you@example.com"
              aria-invalid={form.formState.errors.email ? "true" : "false"}
              onFocus={clearAuthError}
            />
            {form.formState.errors.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="password-login">Password</Label>
            <Input
              id="password-login"
              type="password"
              {...form.register('password')}
              className="mt-1"
              placeholder="••••••••"
              aria-invalid={form.formState.errors.password ? "true" : "false"}
              onFocus={clearAuthError}
            />
            {form.formState.errors.password && <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>}
          </div>
          <CardFooter className="px-0 pt-2">
            <Button type="submit" size="lg" className="w-full text-lg shadow-md" disabled={isAuthenticating}>
              {isAuthenticating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Login
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
