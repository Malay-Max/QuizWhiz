
"use client";

import Link from 'next/link';
import { PlusSquare, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AuthDisplay } from '@/components/auth/AuthDisplay'; // Import AuthDisplay

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/add-question', label: 'Add Question', icon: PlusSquare },
    { href: '/', label: 'Take Quiz', icon: Puzzle },
  ];

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Puzzle className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-headline font-semibold text-primary">QuizCraft</h1>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'default' : 'ghost'}
              asChild
              size="sm" 
              className={cn(
                "hidden sm:flex", // Hide on small screens, show on sm and up
                pathname === item.href && "shadow-md"
              )}
            >
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
           {/* AuthDisplay visible on all screen sizes, placed after nav items */}
          <AuthDisplay />
        </nav>
      </div>
    </header>
  );
}
