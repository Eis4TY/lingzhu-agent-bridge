import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { UserService } from '@/services/auth';

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await UserService.getUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isValid = await UserService.validatePassword(user, currentPassword);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
        }

        await UserService.updatePassword(user.id, newPassword);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 500 });
    }
}
