import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/auth';
import { login } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, email, password } = body;

        if (!username || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await UserService.createUser({ username, email, password });

        // Log the user in immediately after registration
        await login({ id: user.id, username: user.username, email: user.email });

        return NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 400 });
    }
}
