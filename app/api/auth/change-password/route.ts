import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/auth';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { password } = body;

        if (!password || password.length < 5) {
            return NextResponse.json({ error: 'Password must be at least 5 characters' }, { status: 400 });
        }

        // Update password and remove mustChangePassword flag
        const updatedUser = await UserService.updatePassword(session.user.id, password);

        // We need to update the session to reflect the change (mostly to clear the flag in the cookie if we were storing it, 
        // but currently we store the whole user object in the cookie).
        // Since UserService.updatePassword returns the updated user which should NOT have mustChangePassword or it should be false?
        // Let's verify UserService.updatePassword logic.

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 500 });
    }
}
