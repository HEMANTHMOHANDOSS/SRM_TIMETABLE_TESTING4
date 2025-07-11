
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'main_admin' | 'dept_admin' | 'staff';
  department_id?: string;
  staff_role?: 'assistant_professor' | 'professor' | 'hod';
  subjects_selected?: string[];
  subjects_locked?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      setLoading(true);
      console.log('Fetching profile for user:', authUser.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          departments:department_id (
            id,
            name,
            code
          )
        `)
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.name || 'New User',
                role: 'staff' // Default role
              }
            ])
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            setLoading(false);
            return;
          }

          if (newProfile) {
            setUser({
              id: newProfile.id,
              email: authUser.email!,
              name: newProfile.name,
              role: newProfile.role as 'main_admin' | 'dept_admin' | 'staff',
              department_id: newProfile.department_id,
              staff_role: newProfile.staff_role as 'assistant_professor' | 'professor' | 'hod' | undefined,
              subjects_selected: newProfile.subjects_selected ? JSON.parse(newProfile.subjects_selected) : [],
              subjects_locked: newProfile.subjects_locked,
            });
          }
        }
        setLoading(false);
        return;
      }

      if (profile) {
        setUser({
          id: profile.id,
          email: authUser.email!,
          name: profile.name,
          role: profile.role as 'main_admin' | 'dept_admin' | 'staff',
          department_id: profile.department_id,
          staff_role: profile.staff_role as 'assistant_professor' | 'professor' | 'hod' | undefined,
          subjects_selected: profile.subjects_selected ? JSON.parse(profile.subjects_selected) : [],
          subjects_locked: profile.subjects_locked,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Validate SRM email
      if (!email.endsWith('@srmist.edu.in')) {
        return { success: false, error: 'Only @srmist.edu.in emails are allowed' };
      }

      console.log('Attempting login for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before logging in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        }
        
        return { success: false, error: errorMessage };
      }

      console.log('Login successful for:', data.user?.email);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Validate SRM email
      if (!userData.email.endsWith('@srmist.edu.in')) {
        return { success: false, error: 'Only @srmist.edu.in emails are allowed' };
      }

      console.log('Attempting registration for:', userData.email);

      const { data, error } = await supabase.auth.signUp({
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: userData.name,
            role: userData.role,
            department_id: userData.department_id,
            staff_role: userData.staff_role,
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }
        
        return { success: false, error: errorMessage };
      }

      console.log('Registration successful for:', data.user?.email);
      
      // Check if user needs email confirmation
      if (data.user && !data.user.email_confirmed_at) {
        return { success: true, error: 'Please check your email and click the confirmation link to complete registration.' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
