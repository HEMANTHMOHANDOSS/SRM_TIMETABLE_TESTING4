import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUser } from '@/lib/auth-utils';
import { userQueries, departmentQueries } from '@/lib/database';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  employee_id: z.string().min(1, 'Employee ID is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['department_admin', 'staff']),
  department_id: z.number().optional(),
  programme: z.string().optional(),
  type: z.string().optional(),
  contact_number: z.string().optional(),
});

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId || sessionClaims?.metadata?.role !== 'main_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const users = userQueries.getAllUsers.all();
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('Error fetching users:', error);
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
    const validatedData = createUserSchema.parse(body);
    
    // Check if department exists (if provided)
    if (validatedData.department_id) {
      const department = departmentQueries.getDepartmentById.get(validatedData.department_id);
      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 400 }
        );
      }
    }
    
    // Check if email or employee_id already exists
    const existingUser = userQueries.getUserByEmail.get(validatedData.email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    const result = createUser(validatedData);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      credentials: {
        username: result.user.username,
        password: result.user.password,
      },
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}