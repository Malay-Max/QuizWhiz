
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2, Database, ListTree, ArrowLeft } from 'lucide-react';
import { 
  addCategory, 
  getAllCategories,
  getFullCategoryPath,
  seedSampleData,
  type Category as CategoryType
} from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface CategoryOption {
  id: string;
  name: string; 
}

const ROOT_CATEGORY_PLACEHOLDER_VALUE = "--root--";

export default function AddCategoriesPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [allCategories, setAllCategories] = useState<CategoryType[]>([]);
  const [categoryOptionsForSelect, setCategoryOptionsForSelect] = useState<CategoryOption[]>([]);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isSeedingData, setIsSeedingData] = useState(false);

  const refreshAllCategories = useCallback(async () => {
    const cats = await getAllCategories();
    setAllCategories(cats);
    const options = cats.map(cat => ({
      id: cat.id,
      name: getFullCategoryPath(cat.id, cats) || cat.name, 
    })).sort((a,b) => a.name.localeCompare(b.name));
    setCategoryOptionsForSelect(options);
  }, []);

  useEffect(() => {
    refreshAllCategories();
  }, [refreshAllCategories]);

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Category Name Required", description: "Please enter a name for the new category.", variant: "destructive" });
      return;
    }
    setIsAddingCategory(true);
    const result = await addCategory(newCategoryName, newCategoryParentId === ROOT_CATEGORY_PLACEHOLDER_VALUE ? null : newCategoryParentId);
    setIsAddingCategory(false);
    if (result.success && result.id) {
      toast({ title: "Category Added", description: `Category "${newCategoryName}" created.`, className: "bg-accent text-accent-foreground" });
      setNewCategoryName('');
      setNewCategoryParentId(null);
      await refreshAllCategories(); 
    } else {
      toast({ title: "Failed to Add Category", description: result.error || "Could not create category.", variant: "destructive" });
    }
  };

  const handleSeedData = async () => {
    setIsSeedingData(true);
    const result = await seedSampleData();
    setIsSeedingData(false);
    toast({
      title: result.success ? "Seeding Complete" : "Seeding Issue",
      description: result.message,
      variant: result.success ? "default" : "destructive",
      className: result.success ? "bg-accent text-accent-foreground" : ""
    });
    if (result.success) {
      await refreshAllCategories();
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => router.push('/')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
      </Button>
      <Card className="w-full max-w-xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl sm:text-3xl flex items-center">
            <ListTree className="mr-3 h-7 w-7 text-primary" /> Add/Seed Categories
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Add new categories or seed sample data into your quiz application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="p-4 border rounded-lg shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold mb-3">Add New Category</h3>
              <div className="space-y-3">
                  <div>
                      <Label htmlFor="new-category-name">New Category Name</Label>
                      <Input 
                          id="new-category-name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="e.g., Modern Poetry"
                          className="mt-1 text-sm md:text-base"
                      />
                  </div>
                  <div>
                      <Label htmlFor="new-category-parent">Parent Category (Optional)</Label>
                      <Select 
                          value={newCategoryParentId === null ? ROOT_CATEGORY_PLACEHOLDER_VALUE : newCategoryParentId} 
                          onValueChange={(value) => setNewCategoryParentId(value === ROOT_CATEGORY_PLACEHOLDER_VALUE ? null : value)}
                      >
                          <SelectTrigger className="w-full mt-1 text-sm md:text-base">
                              <SelectValue placeholder="Select parent (optional, for root leave empty)" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value={ROOT_CATEGORY_PLACEHOLDER_VALUE}>-- No Parent (Root Category) --</SelectItem>
                              {categoryOptionsForSelect.map(catOpt => (
                                  <SelectItem key={catOpt.id} value={catOpt.id}>{catOpt.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <Button onClick={handleAddNewCategory} disabled={isAddingCategory || !newCategoryName.trim()} className="w-full sm:w-auto text-sm sm:text-base">
                      {isAddingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Category
                  </Button>
              </div>
          </div>
          
          <div className="p-4 border rounded-lg shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold mb-3">Sample Data</h3>
              <Button onClick={handleSeedData} variant="outline" disabled={isSeedingData} className="w-full sm:w-auto text-sm sm:text-base">
                  {isSeedingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />} Seed Sample Data
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Adds sample categories and questions if the database is empty.</p>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Organize your quiz structure by adding new categories and establishing hierarchies.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

    