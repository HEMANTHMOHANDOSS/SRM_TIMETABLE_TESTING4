'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Eye, EyeOff } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  code: string;
}

interface UserRegistrationFormProps {
  departments: Department[];
  onUserCreated: () => void;
}

export function UserRegistrationForm({ departments, onUserCreated }: UserRegistrationFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    employee_id: '',
    email: '',
    role: '',
    department_id: '',
    programme: '',
    type: '',
    contact_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setGeneratedCredentials(data.credentials);
      setShowCredentials(true);
      
      // Reset form
      setFormData({
        name: '',
        employee_id: '',
        email: '',
        role: '',
        department_id: '',
        programme: '',
        type: '',
        contact_number: '',
      });

      toast({
        title: 'Success',
        description: 'User created successfully',
      });

      onUserCreated();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Register New User</CardTitle>
          <CardDescription>
            Create new Department Admin or Staff member accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID *</Label>
                <Input
                  id="employee_id"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="department_admin">Department Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="programme">Programme</Label>
                <Input
                  id="programme"
                  value={formData.programme}
                  onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                  placeholder="e.g., B.Tech, M.Tech"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g., Faculty, Admin"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact Number</Label>
                <Input
                  id="contact_number"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="+91-9999999999"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating User...' : 'Create User'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Please save these credentials and share them with the user securely.
            </DialogDescription>
          </DialogHeader>
          
          {generatedCredentials && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={generatedCredentials.username}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCredentials.username)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={generatedCredentials.password}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCredentials.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> These credentials will not be shown again. 
                  Please save them securely and share with the user through a secure channel.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}