import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-utils';
import { userQueries } from '@/lib/database';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json();
    
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/username and password are required' },
        { status: 400 }
      );
    }
    
    // Authenticate user with our database
    const user = authenticateUser(identifier, password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check if user already has a Clerk account
    let clerkUser;
    try {
      const users = await clerkClient.users.getUserList({
        emailAddress: [user.email],
      });
      clerkUser = users.data[0];
    } catch (error) {
      console.log('User not found in Clerk, will create new account');
    }
    
    // Create Clerk user if doesn't exist
    if (!clerkUser) {
      try {
        clerkUser = await clerkClient.users.createUser({
          emailAddress: [user.email],
          password,
          publicMetadata: {
            role: user.role,
            department_id: user.department_id,
          },
          privateMetadata: {
            internal_user_id: user.id,
          },
        });
        
        // Update our database with Clerk ID
        userQueries.updateClerkId.run(clerkUser.id, user.id);
      } catch (clerkError) {
        console.error('Error creating Clerk user:', clerkError);
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
      },
      clerkUserId: clerkUser.id,
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}