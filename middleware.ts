import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health'
]);

const isMainAdminRoute = createRouteMatcher([
  '/dashboard/main(.*)',
  '/api/admin(.*)'
]);

const isDepartmentAdminRoute = createRouteMatcher([
  '/dashboard/department(.*)',
  '/api/department(.*)'
]);

const isStaffRoute = createRouteMatcher([
  '/staff(.*)',
  '/api/staff(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Redirect to sign-in if not authenticated
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const userRole = sessionClaims?.metadata?.role as string;

  // Role-based route protection
  if (isMainAdminRoute(req) && userRole !== 'main_admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (isDepartmentAdminRoute(req) && userRole !== 'department_admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (isStaffRoute(req) && userRole !== 'staff') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};