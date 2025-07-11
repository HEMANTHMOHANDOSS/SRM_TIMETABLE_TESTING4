
import { useAuth } from '../contexts/ClerkAuthContext';
import { Navigate } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const Login = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/lovable-uploads/fad397d7-a758-4dcd-88f0-c23bceaaa248.png" 
              alt="SRM Logo" 
              className="h-16 w-auto"
            />
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
              fallbackRedirectUrl="/"
              signUpUrl="/register"
            />
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Secure authentication powered by Clerk</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
