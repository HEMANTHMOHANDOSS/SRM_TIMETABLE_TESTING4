'use client';

import { SignIn } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function SignInPage() {
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
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to access the timetable management system
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <SignIn 
              fallbackRedirectUrl="/dashboard"
              signUpUrl="/sign-up"
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
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 font-medium">Main Admin Credentials:</p>
            <p className="text-blue-700">Email: srmtt@srmist.edu.in</p>
            <p className="text-blue-700">Password: mcs2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}