
"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, UserCircle, UserPlus, LogInIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AuthDisplay() {
  const { currentUser, isLoading, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed Out", description: "You have been signed out." });
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="flex items-center px-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (currentUser) {
    const userEmailInitial = currentUser.email ? currentUser.email.charAt(0).toUpperCase() : '?';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              {/* Add AvatarImage if you have user profile images */}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userEmailInitial}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {currentUser.email || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentUser.isAnonymous ? "Anonymous User" : "Authenticated"}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href="/login" className="flex items-center">
          <LogInIcon className="mr-1.5 h-4 w-4" /> Login
        </Link>
      </Button>
      <Button variant="default" size="sm" asChild>
        <Link href="/signup" className="flex items-center">
          <UserPlus className="mr-1.5 h-4 w-4" /> Sign Up
        </Link>
      </Button>
    </div>
  );
}
