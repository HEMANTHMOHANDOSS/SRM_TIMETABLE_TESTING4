'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserButton } from '@clerk/nextjs';
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import { ConstraintsForm } from '@/components/admin/constraints-form';
import { ConstraintsList } from '@/components/admin/constraints-list';

export default function DepartmentConstraintsPage() {
  const { user, isLoaded } = useUser();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (isLoaded && (!user || user.publicMetadata?.role !== 'department_admin')) {
    redirect('/');
  }

  const handleConstraintAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/department">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Department Constraints</h1>
              <p className="text-sm text-gray-600">Manage department-specific constraints</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-sm text-gray-600">Department Administrator</p>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ConstraintsForm onConstraintAdded={handleConstraintAdded} />
          <ConstraintsList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}