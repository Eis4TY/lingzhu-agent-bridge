import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/services/settings';

export async function GET() {
    const settings = getSettings();
    return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        saveSettings(body);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
}
