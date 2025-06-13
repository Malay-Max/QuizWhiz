
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Auth, User, onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Assuming auth is exported from your firebase setup
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  signInAnon: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const signInAnon = async () => {
    setIsLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      setCurrentUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show a global loader while auth state is initially loading
  if (isLoading && currentUser === null) { // Only initial global load
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Initializing Session...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, signInAnon, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
