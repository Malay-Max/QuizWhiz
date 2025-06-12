
"use client";

import type { CategoryTreeNode } from '@/types';
import { Button } from '@/components/ui/button';
import { Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CategoryTreeItemProps {
  node: CategoryTreeNode;
  onSelectCategory: (path: string) => void;
  level: number;
}

export function CategoryTreeItem({ node, onSelectCategory, level }: CategoryTreeItemProps) {
  const [isOpen, setIsOpen] = useState(true); // Default to open, or manage state if complex

  const hasChildren = node.children && node.children.length > 0;

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent category selection when toggling
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelect = () => {
    onSelectCategory(node.path);
  };

  return (
    <div style={{ paddingLeft: `${level * 20}px` }} className="my-1">
      <div className="flex items-center">
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleOpen}
            className="mr-1 p-1 h-auto"
            aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        {!hasChildren && (
            <span className="mr-1 p-1 h-auto w-[28px]"></span> // Placeholder for alignment
        )}
        <Button
          onClick={handleSelect}
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-start text-left h-auto py-2 px-3 shadow-sm hover:bg-primary/10 hover:text-primary transition-all",
            !hasChildren && "ml-[0px]" // Adjust if no toggle button
          )}
          title={`Select category: ${node.path}`}
        >
          <Folder className="mr-2 h-4 w-4 text-primary/80" />
          {node.name}
        </Button>
      </div>
      {isOpen && hasChildren && (
        <div className="mt-1">
          {node.children.map((childNode) => (
            <CategoryTreeItem
              key={childNode.path}
              node={childNode}
              onSelectCategory={onSelectCategory}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
