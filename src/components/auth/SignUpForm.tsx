
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

const signUpSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const { signUpWithEmailPassword, isAuthenticating, authError, clearAuthError } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  useEffect(() => {
    // Clear any previous auth errors when the component mounts or form focus changes
    clearAuthError();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const onSubmit = async (data: SignUpFormData) => {
    clearAuthError();
    const user = await signUpWithEmailPassword(data.email, data.password);
    if (user) {
      toast({
        title: "Account Created!",
        description: "You have successfully signed up.",
        variant: "default",
        className: "bg-accent text-accent-foreground"
      });
      router.push('/'); // Redirect to home page after successful sign up
    }
    // If user is null, authError will be set in AuthContext and displayed
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Create an Account</CardTitle>
        <CardDescription>Enter your email and password to sign up.</CardDescription>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
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
              Sign Up
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
