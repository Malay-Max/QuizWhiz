
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  updateCategoryName,
  deleteCategory,
  getCategoryById,
} from '@/lib/storage';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
});

interface RouteContext {
  params: {
    categoryId: string;
  }
}

// GET /api/categories/:categoryId - Get a single category
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { categoryId } = params;
    const category = await getCategoryById(categoryId);

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error(`Error in GET /api/categories/${params.categoryId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}


// PUT /api/categories/:categoryId - Update a category's name
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { categoryId } = params;
    const body = await request.json();
    const validation = updateCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name } = validation.data;
    const result = await updateCategoryName(categoryId, name);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to update category.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id: categoryId, name } });

  } catch (error) {
    console.error(`Error in PUT /api/categories/${params.categoryId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/categories/:categoryId - Delete a category and all its contents
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { categoryId } = params;
    const result = await deleteCategory(categoryId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to delete category.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { message: `Category ${categoryId} and all its contents deleted successfully.` } });
  
  } catch (error) {
    console.error(`Error in DELETE /api/categories/${params.categoryId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
