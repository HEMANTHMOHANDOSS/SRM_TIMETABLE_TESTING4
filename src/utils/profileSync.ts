
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'main_admin' | 'dept_admin' | 'staff';
  department_id?: string;
  staff_role?: 'assistant_professor' | 'professor' | 'hod';
  subjects_selected?: string;
  subjects_locked?: boolean;
}

export const syncUserProfile = async (user: any): Promise<UserProfile | null> => {
  try {
    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError);
      throw fetchError;
    }

    if (existingProfile) {
      return existingProfile;
    }

    // Create new profile if it doesn't exist
    const newProfile: Partial<UserProfile> = {
      id: user.id,
      name: user.fullName || user.firstName || 'User',
      email: user.primaryEmailAddress?.emailAddress || '',
      role: (user.publicMetadata?.role as any) || 'staff',
      department_id: user.publicMetadata?.department_id as string,
      staff_role: user.publicMetadata?.staff_role as any,
      subjects_selected: null,
      subjects_locked: false
    };

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      throw createError;
    }

    return createdProfile;
  } catch (error) {
    console.error('Error syncing user profile:', error);
    return null;
  }
};
