'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UserButton } from '@clerk/nextjs';
import { ArrowLeft, BookOpen, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

interface Subject {
  id: number;
  name: string;
  code: string;
  credits: number;
  subject_type: string;
}

interface Constraint {
  id: number;
  role: string;
  subject_type: string;
  max_subjects: number;
  max_hours: number;
}

export default function StaffSubjectsPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  if (isLoaded && (!user || user.publicMetadata?.role !== 'staff')) {
    redirect('/');
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await user?.getToken();
        
        // Fetch subjects
        const subjectsResponse = await fetch('/api/subjects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Fetch constraints
        const constraintsResponse = await fetch('/api/constraints', {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch user's current selection
        const userResponse = await fetch('/api/staff/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (subjectsResponse.ok) {
          const subjectsData = await subjectsResponse.json();
          setSubjects(subjectsData);
        }

        if (constraintsResponse.ok) {
          const constraintsData = await constraintsResponse.json();
          setConstraints(constraintsData);
        }

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.subjects_selected) {
            setSelectedSubjects(JSON.parse(userData.subjects_selected));
          }
          setIsLocked(userData.subjects_locked);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, toast]);

  const getApplicableConstraints = () => {
    const staffRole = user?.publicMetadata?.staff_role as string;
    return constraints.filter(constraint => constraint.role === staffRole);
  };

  const getMaxSubjectsAllowed = () => {
    const applicable = getApplicableConstraints();
    if (applicable.length === 0) return 5;
    return Math.max(...applicable.map(c => c.max_subjects));
  };

  const getMaxHoursAllowed = () => {
    const applicable = getApplicableConstraints();
    if (applicable.length === 0) return 20;
    return Math.max(...applicable.map(c => c.max_hours));
  };

  const canSelectMoreSubjects = () => {
    return selectedSubjects.length < getMaxSubjectsAllowed();
  };

  const handleSubjectToggle = (subjectId: number) => {
    if (isLocked) return;

    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
    } else {
      if (canSelectMoreSubjects()) {
        setSelectedSubjects([...selectedSubjects, subjectId]);
      } else {
        toast({
          title: 'Limit Reached',
          description: `You can only select up to ${getMaxSubjectsAllowed()} subjects`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleSaveSelection = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/staff/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user?.getToken()}`,
        },
        body: JSON.stringify({
          subject_ids: selectedSubjects,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save selection');
      }

      toast({
        title: 'Success',
        description: 'Subject selection saved and locked successfully!',
      });

      setIsLocked(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save selection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/staff">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subject Selection</h1>
              <p className="text-sm text-gray-600">Choose subjects to teach</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-sm text-gray-600">
                {user?.publicMetadata?.staff_role?.toString().replace('_', ' ').toUpperCase() || 'Staff Member'}
              </p>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Constraints Info */}
        {constraints.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Constraints
              </CardTitle>
              <CardDescription>
                Subject selection limits based on your role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Max Subjects: {getMaxSubjectsAllowed()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Max Hours per Week: {getMaxHoursAllowed()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subject Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subject Selection</CardTitle>
                <CardDescription>
                  {isLocked 
                    ? "Your subject selection is locked"
                    : `Select subjects to teach (${selectedSubjects.length}/${getMaxSubjectsAllowed()})`
                  }
                </CardDescription>
              </div>
              {!isLocked && selectedSubjects.length > 0 && (
                <Button onClick={handleSaveSelection} disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Lock Selection'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLocked ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    ✅ Your subject selection has been saved and locked.
                  </p>
                </div>
                <div className="grid gap-4">
                  {subjects
                    .filter(subject => selectedSubjects.includes(subject.id))
                    .map((subject) => (
                      <div key={subject.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div>
                          <h3 className="font-medium">{subject.name}</h3>
                          <p className="text-sm text-gray-600">
                            Code: {subject.code} | Credits: {subject.credits} | Type: {subject.subject_type}
                          </p>
                        </div>
                        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          Selected
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No subjects available for your department.</p>
                ) : (
                  subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={subject.id.toString()}
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={() => handleSubjectToggle(subject.id)}
                        disabled={
                          !selectedSubjects.includes(subject.id) && !canSelectMoreSubjects()
                        }
                      />
                      <label htmlFor={subject.id.toString()} className="flex-1 cursor-pointer">
                        <div>
                          <h3 className="font-medium">{subject.name}</h3>
                          <p className="text-sm text-gray-600">
                            Code: {subject.code} | Credits: {subject.credits} | Type: {subject.subject_type}
                          </p>
                        </div>
                      </label>
                      {selectedSubjects.includes(subject.id) && (
                        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          Selected
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}