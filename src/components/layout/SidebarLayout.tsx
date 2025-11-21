"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { ReviewSidebar } from '@/components/quiz/ReviewSidebar';
import { AnalyticsSidebar } from '@/components/quiz/AnalyticsSidebar';

interface SidebarLayoutProps {
    children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
    const pathname = usePathname();

    // Pages where sidebars should NOT appear
    const excludedPaths = ['/login', '/signup'];
    const shouldShowSidebars = !excludedPaths.includes(pathname);

    if (!shouldShowSidebars) {
        // No sidebars for login/signup pages
        return <>{children}</>;
    }

    // Three-column layout with sidebars for all other pages
    return (
        <div className="flex gap-6 items-start justify-center max-w-[1600px] mx-auto">
            {/* Left Sidebar - Review Info */}
            <ReviewSidebar />

            {/* Main Content */}
            <div className="flex-1 max-w-4xl space-y-6">
                {children}
            </div>

            {/* Right Sidebar - Analytics Info */}
            <AnalyticsSidebar />
        </div>
    );
}
