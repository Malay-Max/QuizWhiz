
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
    if (hasChildren && !isOpen && level < 2) { 
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
            className="mr-1 p-1 h-auto flex-shrink-0"
            aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        {!hasChildren && (
            <span className="mr-1 p-1 h-auto w-[28px] flex-shrink-0"></span> 
        )}
        <Button
          onClick={handleSelect}
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-start text-left h-auto py-2 px-3 shadow-sm hover:bg-primary/10 hover:text-primary transition-all whitespace-normal flex items-center min-w-0",
          )}
          title={`${isLeafNode ? 'Manage questions in' : 'Start quiz for'} category: ${node.path}`}
        >
          <Folder className="mr-2 h-4 w-4 text-primary/80 flex-shrink-0" />
          <span className="min-w-0 break-words">{node.name}</span>
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
