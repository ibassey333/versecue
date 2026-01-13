import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/account'];
// Routes that should redirect to dashboard if logged in
const authRoutes = ['/login', '/signup', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Check if accessing protected route without auth
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isOrgRoute = /^\/[a-z0-9-]+(\/|$)/.test(path) && 
                     !path.startsWith('/display') && 
                     !path.startsWith('/api') &&
                     !path.startsWith('/_next') &&
                     !authRoutes.includes(path) &&
                     path !== '/';

  if ((isProtectedRoute || isOrgRoute) && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect logged-in users away from auth pages
  if (authRoutes.includes(path) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
