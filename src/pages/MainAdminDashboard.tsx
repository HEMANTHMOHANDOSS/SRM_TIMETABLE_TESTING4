
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Users, Building2, BookOpen, Calendar, LogOut, Plus, Settings } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import CreateDepartmentDialog from '../components/CreateDepartmentDialog';
import ConstraintsManager from '../components/ConstraintsManager';

interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  department_id?: string;
  staff_role?: string;
  departments?: Department;
}

const MainAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepartments: 0,
    totalSubjects: 0,
    totalTimetables: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateDepartment, setShowCreateDepartment] = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (deptError) throw deptError;

      // Fetch users with departments - use explicit column reference to avoid ambiguity
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          role,
          department_id,
          staff_role,
          departments!profiles_department_id_fkey (
            id,
            name,
            code,
            created_at
          )
        `)
        .order('name');

      if (userError) throw userError;

      // Fetch stats
      const { count: subjectCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true });

      const { count: timetableCount } = await supabase
        .from('timetables')
        .select('*', { count: 'exact', head: true });

      setDepartments(deptData || []);
      
      // Transform user data to match UserProfile interface
      const transformedUsers: UserProfile[] = (userData || []).map(user => ({
        ...user,
        departments: user.departments ? {
          id: user.departments.id,
          name: user.departments.name,
          code: user.departments.code,
          created_at: user.departments.created_at
        } as Department : undefined
      }));
      
      setUsers(transformedUsers);
      setStats({
        totalUsers: userData?.length || 0,
        totalDepartments: deptData?.length || 0,
        totalSubjects: subjectCount || 0,
        totalTimetables: timetableCount || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  if (loading) {
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
            <img 
              src="data:image/png;base64,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"
              alt="SRM Logo" 
              className="h-8 w-8" 
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Main Admin Dashboard</h1>
              <p className="text-sm text-gray-600">SRM Timetable Management System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-600">Main Administrator</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
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
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDepartments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timetables</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTimetables}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Departments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Departments</CardTitle>
                  <CardDescription>Manage academic departments</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowCreateDepartment(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{dept.name}</h3>
                      <p className="text-sm text-gray-600">Code: {dept.code}</p>
                    </div>
                    <Badge variant="secondary">{dept.code}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Users</CardTitle>
                  <CardDescription>Manage user accounts and roles</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-gray-600">
                        {user.departments?.name || 'No Department'}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        user.role === 'main_admin' ? 'default' :
                        user.role === 'dept_admin' ? 'secondary' : 'outline'
                      }
                    >
                      {user.role.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button className="h-20 flex flex-col" onClick={() => setShowCreateDepartment(true)}>
                  <Building2 className="h-6 w-6 mb-2" />
                  Manage Departments
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  User Management
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => setShowConstraints(true)}>
                  <Settings className="h-6 w-6 mb-2" />
                  Constraints Manager
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Calendar className="h-6 w-6 mb-2" />
                  System Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CreateDepartmentDialog 
        open={showCreateDepartment} 
        onOpenChange={setShowCreateDepartment}
        onDepartmentCreated={fetchData}
      />
      
      <ConstraintsManager 
        open={showConstraints}
        onOpenChange={setShowConstraints}
        userRole="main_admin"
      />
    </div>
  );
};

export default MainAdminDashboard;
