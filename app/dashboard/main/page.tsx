'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserButton } from '@clerk/nextjs';
import { Users, Building2, BookOpen, Calendar, Settings, Plus } from 'lucide-react';
import { UserRegistrationForm } from '@/components/admin/UserRegistrationForm';
import { DepartmentForm } from '@/components/admin/DepartmentForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department_name?: string;
  department_code?: string;
}

export default function MainAdminDashboard() {
  const { user, isLoaded } = useUser();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  if (isLoaded && (!user || user.publicMetadata?.role !== 'main_admin')) {
    redirect('/');
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/departments'),
        fetch('/api/admin/users'),
      ]);

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData.departments || []);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Main Admin Dashboard</h1>
              <p className="text-sm text-gray-600">SRM Timetable Management System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-sm text-gray-600">Main Administrator</p>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Department Admins</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'department_admin').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'staff').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="overview">System Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <UserRegistrationForm 
                departments={departments} 
                onUserCreated={fetchData}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>
                    Recently registered users in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {users.slice(0, 10).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{user.name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {user.department_name && (
                            <p className="text-xs text-gray-500">{user.department_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'main_admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'department_admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DepartmentForm onDepartmentCreated={fetchData} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Existing Departments</CardTitle>
                  <CardDescription>
                    All departments in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departments.map((dept) => (
                      <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{dept.name}</h3>
                          <p className="text-sm text-gray-600">Code: {dept.code}</p>
                          {dept.description && (
                            <p className="text-xs text-gray-500">{dept.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                            {dept.code}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Statistics</CardTitle>
                  <CardDescription>
                    Overview of system usage and activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Departments:</span>
                      <span className="font-medium">{departments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Users:</span>
                      <span className="font-medium">{users.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Department Admins:</span>
                      <span className="font-medium">
                        {users.filter(u => u.role === 'department_admin').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Staff Members:</span>
                      <span className="font-medium">
                        {users.filter(u => u.role === 'staff').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common administrative tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border rounded-lg text-center hover:bg-gray-50 cursor-pointer">
                      <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <span className="text-sm">Manage Users</span>
                    </div>
                    <div className="p-4 border rounded-lg text-center hover:bg-gray-50 cursor-pointer">
                      <Building2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <span className="text-sm">Departments</span>
                    </div>
                    <div className="p-4 border rounded-lg text-center hover:bg-gray-50 cursor-pointer">
                      <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <span className="text-sm">Timetables</span>
                    </div>
                    <div className="p-4 border rounded-lg text-center hover:bg-gray-50 cursor-pointer">
                      <Settings className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                      <span className="text-sm">Settings</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}