
"use client";

import type { Category as CategoryType } from '@/types'; // Use new Category type
import { Button } from '@/components/ui/button';
import { Folder, ChevronRight, ChevronDown, Edit } from 'lucide-react'; // Added Edit
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Added useRouter
import { cn } from '@/lib/utils';

interface CategoryTreeItemProps {
  node: CategoryType; 
  onSelectNode: (categoryId: string, isLeaf: boolean) => void; 
  level: number;
}

export function CategoryTreeItem({ node, onSelectNode, level }: CategoryTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false); 
  const router = useRouter(); // Initialize router

  const hasChildren = node.children && node.children.length > 0;
  const isLeafNode = !hasChildren;

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelect = () => {
    onSelectNode(node.id, isLeafNode);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent selection
    router.push(`/quiz/manage/${node.id}`);
  };

  return (
    <div style={{ paddingLeft: `${level * 20}px` }} className="my-1">
      <div className="flex items-center gap-1"> {/* Added gap-1 for spacing */}
        {hasChildren ? (
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
        ) : (
            <span className="mr-1 p-1 h-auto w-[28px] flex-shrink-0"></span> 
        )}
        <Button
          onClick={handleSelect}
          variant="outline"
          size="sm"
          className={cn(
            "flex-grow justify-start text-left h-auto py-2 px-3 shadow-sm hover:bg-primary/10 hover:text-primary transition-all whitespace-normal flex items-center min-w-0",
          )}
          title={`${isLeafNode ? 'Manage questions in' : 'Start quiz for'} category: ${node.fullPath || node.name}`}
        >
          <Folder className="mr-2 h-4 w-4 text-primary/80 flex-shrink-0" />
          <span className="min-w-0 break-words">{node.name}</span>
        </Button>
        <Button
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
            className="p-1 h-auto flex-shrink-0"
            title={`Edit category: ${node.name}`}
        >
            <Edit className="h-4 w-4" />
        </Button>
      </div>
      {isOpen && hasChildren && (
        <div className="mt-1">
          {node.children!.map((childNode) => ( 
            <CategoryTreeItem
              key={childNode.id} 
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
