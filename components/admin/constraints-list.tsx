'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@clerk/nextjs';
import { Trash2 } from 'lucide-react';

interface Constraint {
  id: number;
  department_id?: number;
  department_name?: string;
  department_code?: string;
  role: string;
  subject_type: string;
  max_subjects: number;
  max_hours: number;
  created_by: string;
  created_at: string;
}

interface ConstraintsListProps {
  refreshTrigger: number;
}

export function ConstraintsList({ refreshTrigger }: ConstraintsListProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConstraints = async () => {
    try {
      const departmentId = user?.publicMetadata?.department_id;
      const url = departmentId ? `/api/constraints?department_id=${departmentId}` : '/api/constraints';
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${await user?.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch constraints');
      }

      const data = await response.json();
      setConstraints(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch constraints',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConstraints();
  }, [refreshTrigger, user]);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/constraints/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${await user?.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete constraint');
      }

      toast({
        title: 'Success',
        description: 'Constraint deleted successfully',
      });

      fetchConstraints();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete constraint',
        variant: 'destructive',
      });
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatSubjectType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading constraints...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Constraints</CardTitle>
        <CardDescription>
          Manage workload constraints for staff roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        {constraints.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No constraints found. Create your first constraint above.
          </div>
        ) : (
          <div className="space-y-4">
            {constraints.map((constraint) => (
              <div
                key={constraint.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatRole(constraint.role)}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm">{formatSubjectType(constraint.subject_type)}</span>
                    {constraint.department_name && (
                      <>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-blue-600">
                          {constraint.department_name} ({constraint.department_code})
                        </span>
                      </>
                    )}
                    {!constraint.department_name && (
                      <>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-green-600">Global</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Max {constraint.max_subjects} subjects, {constraint.max_hours} hours/week
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(constraint.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}