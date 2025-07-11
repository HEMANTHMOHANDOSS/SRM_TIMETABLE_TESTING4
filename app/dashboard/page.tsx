import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const role = user.publicMetadata?.role as string;

  switch (role) {
    case 'main_admin':
      redirect('/dashboard/main');
    case 'department_admin':
      redirect('/dashboard/department');
    case 'staff':
      redirect('/staff');
    default:
      redirect('/onboarding');
  }
}