
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  addCategory, 
  getAllCategories,
  buildCategoryTree 
} from '@/lib/storage';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
  parentId: z.string().nullable().optional(),
});

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format'); // 'tree' or 'flat'

    const categories = await getAllCategories();

    if (format === 'tree') {
      const categoryTree = buildCategoryTree(categories);
      return NextResponse.json({ success: true, data: categoryTree });
    }

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Error in GET /api/categories:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    // Since this is a server route, we can't call the client-side addCategory directly.
    // This endpoint should be re-implemented using Firebase Admin SDK for server-side writes.
    // For now, returning an error to indicate it's not implemented on the server.
    // A proper fix would be to separate client/server storage logic.
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ success: false, error: 'This action is not available on the server currently.' }, { status: 501 });
    }

    const { name, parentId } = validation.data;
    const result = await addCategory(name, parentId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to create category.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: { id: result.id } }, { status: 201 });

  } catch (error) {
    console.error("Error in POST /api/categories:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
