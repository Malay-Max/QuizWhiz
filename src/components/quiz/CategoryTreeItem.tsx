
"use client";

import type { CategoryTreeNode } from '@/types';
import { Button } from '@/components/ui/button';
import { Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CategoryTreeItemProps {
  node: CategoryTreeNode;
  onSelectNode: (path: string, isLeaf: boolean) => void; // Updated prop
  level: number;
}

export function CategoryTreeItem({ node, onSelectNode, level }: CategoryTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false); // Default to closed

  const hasChildren = node.children && node.children.length > 0;
  const isLeafNode = !hasChildren;

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelect = () => {
    // If it's a folder and is currently closed, clicking the name might also open it.
    // However, the primary action is to notify the parent.
    if (hasChildren && !isOpen && level < 2) { // Auto-open first few levels for UX, if desired
        // setIsOpen(true); 
    }
    onSelectNode(node.path, isLeafNode);
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
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        {!hasChildren && (
            <span className="mr-1 p-1 h-auto w-[28px]"></span> 
        )}
        <Button
          onClick={handleSelect}
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-start text-left h-auto py-2 px-3 shadow-sm hover:bg-primary/10 hover:text-primary transition-all",
          )}
          title={`${isLeafNode ? 'Manage questions in' : 'Start quiz for'} category: ${node.path}`}
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
              onSelectNode={onSelectNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
