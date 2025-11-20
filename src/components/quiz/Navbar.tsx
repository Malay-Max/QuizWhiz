"use client";

import Link from 'next/link';
import { PlusSquare, Puzzle, BookOpen, Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AuthDisplay } from '@/components/auth/AuthDisplay';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from 'react';

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/add-question', label: 'Add Question', icon: PlusSquare },
    { href: '/', label: 'Take Quiz', icon: Puzzle },
    { href: '/generate-questions', label: 'Generate from Text', icon: Sparkles },
    { href: '/doc', label: 'API Docs', icon: BookOpen },
  ];

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo - Responsive sizing */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
          <Puzzle className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <h1 className="text-lg sm:text-xl md:text-2xl font-headline font-semibold text-primary">QuizCraft</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'default' : 'ghost'}
              asChild
              size="sm"
              className={cn(
                (pathname === item.href) && "shadow-md"
              )}
            >
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
          <AuthDisplay />
        </nav>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          <AuthDisplay />
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle className="font-headline">Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    variant={pathname === item.href ? 'default' : 'ghost'}
                    asChild
                    size="lg"
                    className={cn(
                      "w-full justify-start",
                      (pathname === item.href) && "shadow-md"
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}