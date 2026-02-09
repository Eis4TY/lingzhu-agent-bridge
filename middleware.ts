import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('session');
    let user = null;

    if (sessionCookie) {
        try {
            user = await decrypt(sessionCookie.value);
        } catch (e) {
            // invalid session
        }
    }

    const { pathname } = request.nextUrl;

    // Protected routes
    const protectedRoutes = ['/settings', '/logs', '/sandbox'];
    const isProtected = protectedRoutes.some(route => pathname.startsWith(route)) || pathname === '/';

    if (isProtected && !user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Public routes (login/register) - redirect to home if already logged in
    const authRoutes = ['/login', '/register'];
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if (isAuthRoute && user) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
