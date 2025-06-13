
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, LogOut, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AuthDisplay() {
  const { currentUser, isLoading, signInAnon, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async () => {
    const user = await signInAnon();
    if (user) {
      toast({ title: "Signed In", description: "You are now signed in anonymously." });
    } else {
      toast({ title: "Sign In Failed", description: "Could not sign in anonymously.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed Out", description: "You have been signed out." });
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="flex items-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (currentUser) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground flex items-center">
          <UserCircle className="h-5 w-5 mr-1.5 text-primary" />
          Guest
        </span>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex items-center">
          <LogOut className="mr-1 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignIn} className="flex items-center">
      <LogIn className="mr-2 h-4 w-4" />
      Sign In Anonymously
    </Button>
  );
}
