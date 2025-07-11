'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { GraduationCap } from 'lucide-react';

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role: '',
    department_id: '',
    staff_role: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update user metadata in Clerk
      await user?.update({
        publicMetadata: {
          role: formData.role,
          department_id: formData.department_id || undefined,
          staff_role: formData.staff_role || undefined,
        },
      });

      // Create user record in database
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user?.getToken()}`,
        },
        body: JSON.stringify({
          id: user?.id,
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName,
          role: formData.role,
          department_id: formData.department_id ? parseInt(formData.department_id) : null,
          staff_role: formData.staff_role || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user record');
      }

      toast({
        title: 'Success',
        description: 'Profile setup completed successfully!',
      });

      // Redirect based on role
      switch (formData.role) {
        case 'main_admin':
          router.push('/dashboard/main');
          break;
        case 'department_admin':
          router.push('/dashboard/department');
          break;
        case 'staff':
          router.push('/staff');
          break;
        default:
          router.push('/');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to setup profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide additional information to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="department_admin">Department Admin</SelectItem>
                  <SelectItem value="main_admin">Main Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.role === 'department_admin' || formData.role === 'staff') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Computer Science Engineering</SelectItem>
                    <SelectItem value="2">Electronics & Communication Engineering</SelectItem>
                    <SelectItem value="3">Mechanical Engineering</SelectItem>
                    <SelectItem value="4">Civil Engineering</SelectItem>
                    <SelectItem value="5">Information Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.role === 'staff' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Staff Role</label>
                <Select
                  value={formData.staff_role}
                  onValueChange={(value) => setFormData({ ...formData, staff_role: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistant_professor">Assistant Professor</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="hod">Head of Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}