
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  Auth,
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app'; // Changed: FirebaseError imported from firebase/app
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticating: boolean; // For specific auth actions like login/signup
  authError: string | null;
  signUpWithEmailPassword: (email: string, pass: string) => Promise<User | null>;
  signInWithEmailPassword: (email: string, pass: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial auth state loading
  const [isAuthenticating, setIsAuthenticating] = useState(false); // For login/signup process
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearAuthError = () => {
    setAuthError(null);
  };

  const mapFirebaseError = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email address is already in use.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled.'; // Remind to check Firebase console
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/invalid-credential': // General error for wrong email/password combo in v9+
        return 'Invalid email or password.';
      case 'auth/wrong-password': // Older SDK, but good to keep for reference
        return 'Invalid email or password.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const signUpWithEmailPassword = async (email: string, pass: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      setCurrentUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing up:", error);
      if (error instanceof FirebaseError) {
        setAuthError(mapFirebaseError(error.code));
      } else {
        setAuthError('An unexpected error occurred during sign up.');
      }
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signInWithEmailPassword = async (email: string, pass: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      setCurrentUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in:", error);
       if (error instanceof FirebaseError) {
        setAuthError(mapFirebaseError(error.code));
      } else {
        setAuthError('An unexpected error occurred during sign in.');
      }
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async () => {
    // No need for isAuthenticating here as it's usually quick
    setIsLoading(true); // Use general loading for sign out visual feedback if needed
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      if (error instanceof FirebaseError) {
        setAuthError(mapFirebaseError(error.code));
      } else {
        setAuthError('An unexpected error occurred during sign out.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading && currentUser === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Initializing Session...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isLoading, 
      isAuthenticating, 
      authError,
      signUpWithEmailPassword, 
      signInWithEmailPassword, 
      signOut,
      clearAuthError
    }}>
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
