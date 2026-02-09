import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/auth';
import { login } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { identifier, password } = body; // identifier can be username or email

        if (!identifier || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await UserService.getUser(identifier);

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
            return NextResponse.json({ error: `Account is locked. Try again in ${minutesLeft} minutes.` }, { status: 403 });
        }

        const isValid = await UserService.validatePassword(user, password);

        // Update login attempts logic regardless of success/failure first to track attempts
        // But if valid, we reset. If invalid, we increment.

        if (!isValid) {
            // Check consecutive failures
            await UserService.handleLoginAttempt(user.id, false);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Reset failures on success
        await UserService.handleLoginAttempt(user.id, true);

        // Create session
        await login({ id: user.id, username: user.username, email: user.email });

        return NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
    }
}
