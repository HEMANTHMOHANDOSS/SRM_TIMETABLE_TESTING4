'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@clerk/nextjs';

interface ConstraintsFormProps {
  departments?: Array<{ id: number; name: string; code: string }>;
  onConstraintAdded: () => void;
}

export function ConstraintsForm({ departments = [], onConstraintAdded }: ConstraintsFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    department_id: '',
    role: '',
    subject_type: '',
    max_subjects: '',
    max_hours: '',
  });

  const isMainAdmin = user?.publicMetadata?.role === 'main_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/constraints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user?.getToken()}`,
        },
        body: JSON.stringify({
          department_id: formData.department_id || null,
          role: formData.role,
          subject_type: formData.subject_type,
          max_subjects: parseInt(formData.max_subjects),
          max_hours: parseInt(formData.max_hours),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create constraint');
      }

      toast({
        title: 'Success',
        description: 'Constraint created successfully',
      });

      setFormData({
        department_id: '',
        role: '',
        subject_type: '',
        max_subjects: '',
        max_hours: '',
      });

      onConstraintAdded();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create constraint',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Constraint</CardTitle>
        <CardDescription>
          Define workload constraints for staff roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isMainAdmin && (
            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => setFormData({ ...formData, department_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (leave empty for global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (All Departments)</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Staff Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
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

          <div className="space-y-2">
            <Label htmlFor="subject_type">Subject Type</Label>
            <Select
              value={formData.subject_type}
              onValueChange={(value) => setFormData({ ...formData, subject_type: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="theory">Theory</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_subjects">Max Subjects</Label>
              <Input
                id="max_subjects"
                type="number"
                min="1"
                max="10"
                value={formData.max_subjects}
                onChange={(e) => setFormData({ ...formData, max_subjects: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_hours">Max Hours/Week</Label>
              <Input
                id="max_hours"
                type="number"
                min="1"
                max="40"
                value={formData.max_hours}
                onChange={(e) => setFormData({ ...formData, max_hours: e.target.value })}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Constraint'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}