"use client";

import Link from 'next/link';
import { PlusSquare, Puzzle, BookOpen, Menu, Sparkles, Calendar, BarChart } from 'lucide-react';
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
    { href: '/review', label: 'Review', icon: Calendar },
    { href: '/analytics', label: 'Analytics', icon: BarChart },
    { href: '/generate-questions', label: 'Generate from Text', icon: Sparkles },
    { href: '/doc', label: 'API Docs', icon: BookOpen },
  ];

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Puzzle className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <h1 className="text-lg sm:text-xl md:text-2xl font-headline font-semibold text-primary">QuizCraft</h1>
        </Link>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-1 justify-center max-w-4xl">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'default' : 'ghost'}
              asChild
              size="sm"
              className={cn(
                "text-xs xl:text-sm",
                (pathname === item.href) && "shadow-md"
              )}
            >
              <Link href={item.href} className="flex items-center gap-1.5">
                <item.icon className="h-4 w-4" />
                <span className="hidden xl:inline">{item.label}</span>
                <span className="xl:hidden truncate">{item.label.split(' ')[0]}</span>
              </Link>
            </Button>
          ))}
        </nav>

        {/* Desktop Auth - Right aligned */}
        <div className="hidden lg:flex items-center flex-shrink-0">
          <AuthDisplay />
        </div>

        {/* Mobile Navigation */}
        <div className="flex lg:hidden items-center gap-2">
          <AuthDisplay />
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 sm:w-80">
              <SheetHeader>
                <SheetTitle className="font-headline">Navigation</SheetTitle>
              </SheetHeader>

              {/* Auth in mobile menu */}
              <div className="mt-4 pb-4 border-b">
                <AuthDisplay />
              </div>

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