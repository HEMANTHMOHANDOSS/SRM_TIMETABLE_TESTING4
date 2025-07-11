'use client';

import { SignUp } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SRM Timetable AI</h1>
          <p className="text-gray-600">SRM College Ramapuram</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Register for access to the timetable management system
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <SignUp 
              fallbackRedirectUrl="/dashboard"
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                  card: 'shadow-none',
                },
              }}
            />
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Secure authentication powered by Clerk</p>
        </div>
      </div>
    </div>
  );
}