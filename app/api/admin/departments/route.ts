import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { departmentQueries, userQueries } from '@/lib/database';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const departments = departmentQueries.getAllDepartments.all();
    return NextResponse.json({ departments });
    
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId || sessionClaims?.metadata?.role !== 'main_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validatedData = createDepartmentSchema.parse(body);
    
    // Check if department code already exists
    const existingDept = departmentQueries.getDepartmentByCode.get(validatedData.code);
    if (existingDept) {
      return NextResponse.json(
        { error: 'Department code already exists' },
        { status: 400 }
      );
    }
    
    // Get the internal user ID
    const internalUser = userQueries.getUserByClerkId.get(userId);
    if (!internalUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const result = departmentQueries.createDepartment.run(
      validatedData.name,
      validatedData.code,
      validatedData.description || null,
      internalUser.id
    );
    
    return NextResponse.json({
      success: true,
      message: 'Department created successfully',
      department: {
        id: result.lastInsertRowid,
        ...validatedData,
      },
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}