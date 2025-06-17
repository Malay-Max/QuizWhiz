
"use client";

import type { Category as CategoryType } from '@/types'; // Use new Category type
import { Button } from '@/components/ui/button';
import { Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CategoryTreeItemProps {
  node: CategoryType; // Changed to CategoryType
  onSelectNode: (categoryId: string, isLeaf: boolean) => void; // Changed to categoryId
  level: number;
}

export function CategoryTreeItem({ node, onSelectNode, level }: CategoryTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false); 

  const hasChildren = node.children && node.children.length > 0;
  const isLeafNode = !hasChildren;

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelect = () => {
    // Pass node.id (categoryId) and isLeafNode status
    onSelectNode(node.id, isLeafNode);
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
          title={`${isLeafNode ? 'Manage questions in' : 'Start quiz for'} category: ${node.fullPath || node.name}`}
        >
          <Folder className="mr-2 h-4 w-4 text-primary/80 flex-shrink-0" />
          <span className="min-w-0 break-words">{node.name}</span>
        </Button>
      </div>
      {isOpen && hasChildren && (
        <div className="mt-1">
          {node.children!.map((childNode) => ( // Use ! as hasChildren check ensures children exist
            <CategoryTreeItem
              key={childNode.id} // Use childNode.id
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

